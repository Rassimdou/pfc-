import { sendInvitationEmail } from "../services/emailService";

router.get('/test-email', async (req, res) => {
    const success = await sendInvitationEmail(
        'test@example.com',
        'test-token-123'
    );
    res.json ({ success });
});