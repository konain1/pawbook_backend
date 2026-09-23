const jwt = require('jsonwebtoken');
const Message = require('../models/message.model');
const User = require('../models/user.model');

const setupSocket = (io) => {
    // Authenticate socket connections using JWT
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) return next(new Error('Authentication required'));

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.id;
            next();
        } catch (err) {
            next(new Error('Invalid token'));
        }
    });

    // Track online users
    const onlineUsers = new Map();

    io.on('connection', (socket) => {
        const userId = socket.userId;
        onlineUsers.set(userId, socket.id);
        console.log(`🔌 User connected: ${userId}`);

        // Notify friends that user is online
        io.emit('userOnline', userId);

        // Join personal room for receiving messages
        socket.join(userId);

        // Socket rate limiting
        const rateLimits = new Map();
        const checkRateLimit = (event, maxPerMinute) => {
            const now = Date.now();
            if (!rateLimits.has(event)) rateLimits.set(event, []);
            const timestamps = rateLimits.get(event).filter(t => now - t < 60000);
            rateLimits.set(event, timestamps);
            if (timestamps.length >= maxPerMinute) {
                socket.emit('rateLimited', { message: `Too many ${event} events, slow down.` });
                return false;
            }
            timestamps.push(now);
            return true;
        };

        // Send message in real-time
        socket.on('sendMessage', async (data) => {
            if (!checkRateLimit('sendMessage', 30)) return;
            try {
                const { receiverId, text } = data;

                if (!text || !receiverId) return;

                // Verify they are friends
                const user = await User.findById(userId);
                if (!user.friends.includes(receiverId)) return;

                // Save message to DB
                const message = await Message.create({
                    sender: userId,
                    receiver: receiverId,
                    text,
                });

                const populatedMessage = await message.populate([
                    { path: 'sender', select: 'username avatar' },
                    { path: 'receiver', select: 'username avatar' },
                ]);

                // Send to receiver's room
                io.to(receiverId).emit('newMessage', populatedMessage);

                // Send back to sender for confirmation
                socket.emit('messageSent', populatedMessage);
            } catch (err) {
                socket.emit('messageError', { message: 'Failed to send message' });
            }
        });

        // Typing indicator
        socket.on('typing', (receiverId) => {
            if (!checkRateLimit('typing', 60)) return;
            io.to(receiverId).emit('userTyping', { userId });
        });

        socket.on('stopTyping', (receiverId) => {
            if (!checkRateLimit('stopTyping', 60)) return;
            io.to(receiverId).emit('userStopTyping', { userId });
        });

        // Mark messages as read
        socket.on('markRead', async (senderId) => {
            if (!checkRateLimit('markRead', 30)) return;
            await Message.updateMany(
                { sender: senderId, receiver: userId, read: false },
                { read: true }
            );
            io.to(senderId).emit('messagesRead', { readBy: userId });
        });

        // Disconnect
        socket.on('disconnect', () => {
            onlineUsers.delete(userId);
            io.emit('userOffline', userId);
            console.log(`🔌 User disconnected: ${userId}`);
        });
    });

    return io;
};

module.exports = setupSocket;
