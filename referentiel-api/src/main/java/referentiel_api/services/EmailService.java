package referentiel_api.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    public void sendVerificationCode(String toEmail, String code) {
        System.out.println("==================================================");
        System.out.println("🔑 [MFA CODE GENERATED]");
        System.out.println("📧 Pour l'utilisateur : " + toEmail);
        System.out.println("🔢 Code de vérification : " + code);
        System.out.println("==================================================");

        if (mailSender == null) {
            System.out.println("⚠️ JavaMailSender non configuré. L'email n'a pas été envoyé.");
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom("no-reply@referentiel.com");
            message.setTo(toEmail);
            message.setSubject("Référentiel SI - Code de confirmation double facteur (2FA)");
            message.setText("Bonjour,\n\n"
                    + "Une tentative de connexion avec votre compte Microsoft a été détectée.\n"
                    + "Pour finaliser votre connexion, veuillez utiliser le code de vérification suivant :\n\n"
                    + "👉 " + code + " 👈\n\n"
                    + "Ce code est valide pendant 5 minutes.\n"
                    + "Si vous n'êtes pas à l'origine de cette tentative, veuillez ignorer cet email.\n\n"
                    + "Cordialement,\n"
                    + "L'équipe Système Référentiel SI");
            mailSender.send(message);
            System.out.println("✅ Email de confirmation 2FA envoyé avec succès à : " + toEmail);
        } catch (Exception e) {
            System.err.println("❌ Erreur lors de l'envoi de l'email : " + e.getMessage());
            System.out.println("💡 Conseil : Le code de vérification " + code + " a été généré et peut être utilisé en dev.");
        }
    }
}
