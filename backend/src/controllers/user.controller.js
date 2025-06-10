import FriendRequest from "../models/FriendRequest.js";
import User from "../models/User.js";

export async function getRecommendedUsers(req, res){
    try{
        const currentUserId = req.user.id;
        const currentUser = req.user;

        const recommendedUsers = await User.find({
            $and: [
                {_id: {$ne: currentUserId} }, //exclude current user
                {$id: {$nin: currentUser.friends}},
                {isOnboarded: true}
            ]
        })
        res.status(200).json({success: true, recommendedUsers});
    }
    catch(error){
        console.error("Error while getting recommended users", error);
        res.status(500).json({message: "Internal server error while getting recommended users."});
    }
}

export async function getMyFriends(req, res){
    try{
        const user = await User.findById(req.user.id)
        .select("friends")
        .populate("friends", "fullName profilePic nativeLanguage learningLanguage");

        res.status(200).json(user.friends);
    }
    catch(error){
        console.error("Error while getting my friends.", error);
        res.status(500).json({message: "Internal server error while getting my friends."});
    }
}

export async function sendFriendRequest(req, res){
    try{
        const myId = req.user.id;
        const {id: recipientId} = req.params;

        // prevent sending request to yourself
        if(myId === recipientId) return res.status(400).json({message: 'Cannot send friend request to yourself.'});

        // check if recipient exists
        const recipient = await User.findById(recipientId);
        if(!recipient) return res.status(404).json({message: 'Recipient not found.'});

        //check if recipient is already a friend
        if(recipient.friends.includes(myId)) return res.status(400).json({message: "You're already friends with this user."});

        //check if theres already a request
        const existingRequest = await FriendRequest.findOne({
            $or: [
                {sender: myId, recipient: recipientId},
                {sender: recipientId, recipient: myId}
            ]
        })
        if(existingRequest){
            return res.status(400).json({message: 'A friend request already exists between you and this user.'});
        }

        const friendRequest = await FriendRequest.create({
            sender: myId,
            recipient: recipientId,
        })
        res.status(201).json(friendRequest);
    }
    catch(error){
        console.error("Error while sending friend request.", error);
        res.status(500).json({message: 'Internal server error'});
    }
}

export async function acceptFriendRequest(req, res) {
    try{
        const {id: requestId} = req.params;
        const friendRequest = await FriendRequest.findById(requestId);

        if(!friendRequest) return res.status(404).json({message: "Friend request not found."});

        if(!friendRequest.recipient.toString() === req.user.id) return res.status(403).json({message: "You are not authorized to accept this request."});

        friendRequest.status = "accepted";
        await friendRequest.save();

        // add each user to others friends list
        await User.findByIdAndUpdate(friendRequest.sender, {
            $addToSet: {friends: friendRequest.recipient}
        })
        await User.findByIdAndUpdate(friendRequest.recipient, {
            $addToSet: {friends: friendRequest.sender}
        })
    }
    catch(error){
        console.error("Error while accepting friend request.", error);
    }
}

export async function getFriendRequests(req,res){
    try{
        const incomingReqs = await FriendRequest.find({
            recipient: req.user.id,
            status: "pending",
        })
        .populate("sender", "fullName profilePic nativeLanguage learningLanguage");

        const acceptedReqs = await FriendRequest.find({
            recipient: req.user.id,
            status: "accepted",
        })
        .populate("recipient", "fullName profilePic");

        res.status(200).json({incomingReqs, acceptedReqs});
    }
    catch(error){
        console.log("Error getting the friend requests.", error);
    }
}

export async function getOutgoingFriendRequests(req, res){
    try{
        const outgoingReqs = await FriendRequest.find({
            sender: req.user.id,
            status: "pending"
        })
        .populate("recipient", "fullName profilePic nativeLanguage learningLanguage");
        res.status(200).json(outgoingReqs);
    }
    catch(error){
        console.error("Error while getting outgoing friend requests.", error);
    }
}