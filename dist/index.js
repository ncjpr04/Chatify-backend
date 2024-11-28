"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const wss = new ws_1.WebSocketServer({ port: 4000 });
let allSockets = [];
let messageHistory = {}; // Store messages by room
wss.on("connection", (socket) => {
    socket.on("message", (message) => {
        const parsedMessage = JSON.parse(message.toString());
        // Handle 'join' type message (user joining a room)
        if (parsedMessage.type === "join") {
            const newUser = {
                socket,
                room: parsedMessage.payload.roomId,
            };
            // Add the new user with room information
            allSockets.push(newUser);
            // Send previous messages to the new user
            const roomHistory = messageHistory[parsedMessage.payload.roomId] || [];
            socket.send(JSON.stringify({
                type: "messageHistory",
                payload: { messages: roomHistory },
            }));
            // Broadcast the updated user list to all users in the room
            broadcastUserList(parsedMessage.payload.roomId);
            // Handle user disconnection
            socket.on("close", () => {
                allSockets = allSockets.filter((user) => user.socket !== socket);
                broadcastUserList(parsedMessage.payload.roomId); // Update user list on disconnect
            });
        }
        // Handle 'chat' type message (user sending a chat message)
        if (parsedMessage.type === "chat") {
            const currentUser = allSockets.find((user) => user.socket === socket);
            const currentUserRoom = currentUser === null || currentUser === void 0 ? void 0 : currentUser.room;
            if (currentUserRoom) {
                // Store message in history for the room
                if (!messageHistory[currentUserRoom]) {
                    messageHistory[currentUserRoom] = [];
                }
                messageHistory[currentUserRoom].push(parsedMessage.payload.message);
                // Broadcast the message to other users in the same room
                allSockets.forEach((user) => {
                    if (user.room === currentUserRoom && user.socket !== socket) {
                        user.socket.send(JSON.stringify({
                            type: "chat",
                            payload: { message: parsedMessage.payload.message },
                        }));
                    }
                });
            }
        }
    });
});
// Function to broadcast the user list to all clients in the same room
const broadcastUserList = (roomId) => {
    const usersInRoom = allSockets
        .filter((user) => user.room === roomId)
        .map((user) => user.socket);
    usersInRoom.forEach((userSocket) => {
        const userList = allSockets
            .filter((user) => user.socket !== userSocket && user.room === roomId)
            .map((user) => user.socket);
        // Send the updated list of users (including the current user)
        userSocket.send(JSON.stringify({
            type: "userList",
            payload: { users: usersInRoom.length }, // Include the current user in the count
        }));
    });
};
wss.on("listening", () => {
    console.log("WebSocket server is running on port 4000");
});
wss.on("error", (error) => {
    console.error("WebSocket error:", error);
});
