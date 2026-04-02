const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();
const messageModel = require("../schemas/messages");
const userModel = require("../schemas/users");
const { checkLogin } = require("../utils/authHandler");
const { uploadImage } = require("../utils/uploadHandler");

router.get("/", checkLogin, async function (req, res) {
  try {
    const currentUserId = req.user._id;
    const partnerId = req.query.userID || req.query.userId;
    const includeAllMessages =
      String(req.query.all || "").toLowerCase() === "true";

    // Optional mode: /messages?userID=<id> returns full conversation
    if (partnerId) {
      if (!mongoose.Types.ObjectId.isValid(partnerId)) {
        return res.status(400).send({ message: "userID khong hop le" });
      }

      const messages = await messageModel
        .find({
          $or: [
            { from: currentUserId, to: partnerId },
            { from: partnerId, to: currentUserId },
          ],
        })
        .sort({ createdAt: 1 })
        .populate("from", "username email avatarUrl")
        .populate("to", "username email avatarUrl");

      return res.send(messages);
    }

    const messages = await messageModel
      .find({
        $or: [{ from: currentUserId }, { to: currentUserId }],
      })
      .sort({ createdAt: -1 })
      .populate("from", "username email avatarUrl")
      .populate("to", "username email avatarUrl");

    // Explicit mode: /messages?all=true returns all messages of current user.
    if (includeAllMessages) {
      return res.send(messages);
    }

    const latestByPartner = new Map();

    for (const message of messages) {
      const fromId = String(message.from._id || message.from);
      const toId = String(message.to._id || message.to);
      const currentId = String(currentUserId);
      const partnerId = fromId === currentId ? toId : fromId;

      if (!latestByPartner.has(partnerId)) {
        latestByPartner.set(partnerId, message);
      }
    }

    res.send(Array.from(latestByPartner.values()));
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

router.get("/:userID", checkLogin, async function (req, res) {
  try {
    const currentUserId = req.user._id;
    const partnerId = req.params.userID;

    if (!mongoose.Types.ObjectId.isValid(partnerId)) {
      return res.status(400).send({ message: "userID khong hop le" });
    }

    const messages = await messageModel
      .find({
        $or: [
          { from: currentUserId, to: partnerId },
          { from: partnerId, to: currentUserId },
        ],
      })
      .sort({ createdAt: 1 })
      .populate("from", "username email avatarUrl")
      .populate("to", "username email avatarUrl");

    res.send(messages);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

router.post(
  "/:userID",
  checkLogin,
  uploadImage.single("file"),
  async function (req, res) {
    try {
      const currentUserId = req.user._id;
      const toUserId = req.params.userID;

      if (!mongoose.Types.ObjectId.isValid(toUserId)) {
        return res.status(400).send({ message: "userID khong hop le" });
      }

      if (String(currentUserId) === String(toUserId)) {
        return res
          .status(400)
          .send({ message: "khong the tu nhan tin cho chinh minh" });
      }

      const toUser = await userModel.findOne({
        _id: toUserId,
        isDeleted: false,
      });
      if (!toUser) {
        return res.status(404).send({ message: "nguoi nhan khong ton tai" });
      }

      const trimmedText = String(req.body.text || "").trim();
      const filePath = req.file ? req.file.path.replace(/\\/g, "/") : "";

      if (!trimmedText && !filePath) {
        return res
          .status(400)
          .send({ message: "noi dung tin nhan khong duoc rong" });
      }

      const payloads = [];

      if (trimmedText) {
        payloads.push({
          from: currentUserId,
          to: toUserId,
          messageContent: {
            type: "text",
            text: trimmedText,
          },
        });
      }

      if (filePath) {
        payloads.push({
          from: currentUserId,
          to: toUserId,
          messageContent: {
            type: "file",
            text: filePath,
          },
        });
      }

      const createdMessages = await messageModel.insertMany(payloads);

      const populatedMessages = await messageModel.populate(createdMessages, [
        { path: "from", select: "username email avatarUrl" },
        { path: "to", select: "username email avatarUrl" },
      ]);

      if (populatedMessages.length === 1) {
        return res.status(201).send(populatedMessages[0]);
      }

      res.status(201).send({
        message: "da gui text va file thanh cong",
        data: populatedMessages,
      });
    } catch (error) {
      res.status(400).send({ message: error.message });
    }
  },
);

module.exports = router;
