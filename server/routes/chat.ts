import { Router } from "express";
import { z } from "zod";

const router = Router();

// Schema for chat message validation
const chatMessageSchema = z.object({
  message: z.string().min(1),
});

// Chat endpoint
router.post("/", async (req, res) => {
  try {
    // Validate request body
    const { message } = chatMessageSchema.parse(req.body);

    // TODO: Integrate with actual AI service
    // For now, return a mock response
    const response = {
      response: `I received your message: "${message}". This is a mock response. In production, this will be replaced with actual AI responses.`,
    };

    res.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid request body" });
    } else {
      console.error("Chat error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

export default router; 