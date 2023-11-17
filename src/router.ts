import { Router } from 'itty-router';
import botHandler from './handler/botHandler';
import genHandler from './handler/genHandler';
import webhookHandler from "./handler/webhookHandler";

// now let's create a router (note the lack of "new")
const router = Router();

// 生成各种开发数据
router.get("/api/gen", genHandler);

// bot webhook
router.post("/api/bot_handler", webhookHandler);

// 404 for everything else
router.all('*', () => new Response('Not Found.', { status: 404 }));

export default router;
