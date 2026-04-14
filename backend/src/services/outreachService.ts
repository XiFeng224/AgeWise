import axios from 'axios'
import { Elderly } from '../models'

type SmsProvider = 'none' | 'twilio' | 'webhook'

class OutreachService {
  private getSmsProvider(): SmsProvider {
    const provider = (process.env.SMS_PROVIDER || 'none').toLowerCase()
    if (provider === 'twilio' || provider === 'webhook') return provider
    return 'none'
  }

  async notifyFamilyForUrgentRisk(elderly: Elderly, content: string) {
    const wecomEnabled = process.env.WECOM_ENABLED === 'true'
    const smsProvider = this.getSmsProvider()

    const result = {
      sms: {
        provider: smsProvider,
        success: false as boolean,
        target: elderly.emergencyPhone || '',
        error: ''
      },
      wecom: {
        enabled: wecomEnabled,
        success: false as boolean,
        webhook: !!process.env.WECOM_WEBHOOK_URL,
        error: ''
      }
    }

    const phone = elderly.emergencyPhone
    if (phone && smsProvider !== 'none') {
      try {
        if (smsProvider === 'twilio') {
          await this.sendSmsByTwilio(phone, content)
        } else if (smsProvider === 'webhook') {
          await this.sendSmsByWebhook(phone, content)
        }
        result.sms.success = true
      } catch (error) {
        const msg = (error as Error).message || '短信发送失败'
        result.sms.error = msg
        console.error('短信通知失败:', msg)
      }
    }

    if (wecomEnabled && process.env.WECOM_WEBHOOK_URL) {
      try {
        await axios.post(process.env.WECOM_WEBHOOK_URL, {
          msgtype: 'text',
          text: { content: `[社区养老紧急提醒] ${content}` }
        })
        result.wecom.success = true
      } catch (error) {
        const msg = (error as Error).message || '企业微信通知失败'
        result.wecom.error = msg
        console.error('企业微信通知失败:', msg)
      }
    }

    return result
  }

  private async sendSmsByTwilio(to: string, body: string) {
    const sid = process.env.TWILIO_ACCOUNT_SID
    const token = process.env.TWILIO_AUTH_TOKEN
    const from = process.env.TWILIO_FROM

    if (!sid || !token || !from) {
      throw new Error('Twilio 配置缺失，请检查 TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_FROM')
    }

    const payload = new URLSearchParams({
      To: to,
      From: from,
      Body: body
    })

    await axios.post(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, payload.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      auth: {
        username: sid,
        password: token
      }
    })
  }

  private async sendSmsByWebhook(to: string, body: string) {
    const webhook = process.env.SMS_WEBHOOK_URL
    const token = process.env.SMS_WEBHOOK_TOKEN

    if (!webhook) {
      throw new Error('SMS_WEBHOOK_URL 未配置')
    }

    await axios.post(
      webhook,
      {
        to,
        body,
        source: 'elderly-care-platform'
      },
      {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      }
    )
  }
}

export default new OutreachService()
