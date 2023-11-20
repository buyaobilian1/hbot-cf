import { Router } from 'itty-router';
import webhookHandler from "./handler/webhookHandler";

// now let's create a router (note the lack of "new")
const router = Router();

// bot webhook
router.post("/api/bot_handler", webhookHandler);

// 404 for everything else
router.all('*', () => new Response('Not Found.', { status: 404 }));

export default router;
