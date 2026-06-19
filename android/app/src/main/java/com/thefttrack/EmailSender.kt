package com.thefttrack

import java.io.File
import java.util.Properties
import javax.mail.*
import javax.mail.internet.*

object EmailSender {

    fun send(
        fromEmail: String,
        appPassword: String,
        toEmail: String,
        subject: String,
        body: String,
        attachments: List<File>
    ): Boolean {
        return try {
            val props = Properties().apply {
                put("mail.smtp.host", "smtp.gmail.com")
                put("mail.smtp.port", "587")
                put("mail.smtp.auth", "true")
                put("mail.smtp.starttls.enable", "true")
                put("mail.smtp.ssl.trust", "smtp.gmail.com")
            }

            val session = Session.getInstance(props, object : Authenticator() {
                override fun getPasswordAuthentication() =
                    PasswordAuthentication(fromEmail, appPassword)
            })

            val message = MimeMessage(session).apply {
                setFrom(InternetAddress(fromEmail, "TheftTrack"))
                setRecipients(Message.RecipientType.TO, InternetAddress.parse(toEmail))
                setSubject(subject)
            }

            val multipart = MimeMultipart()

            val textPart = MimeBodyPart().apply { setText(body) }
            multipart.addBodyPart(textPart)

            attachments.forEach { file ->
                if (file.exists()) {
                    val attachPart = MimeBodyPart()
                    attachPart.attachFile(file)
                    multipart.addBodyPart(attachPart)
                }
            }

            message.setContent(multipart)
            Transport.send(message)
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }
}
