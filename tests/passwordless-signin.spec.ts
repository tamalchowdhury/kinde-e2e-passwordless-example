import { test, expect } from '@playwright/test'
import MailosaurClient from 'mailosaur'
require('dotenv').config()

const mailosaur = new MailosaurClient(process.env.MAILOSAUR_API_KEY!)
const serverId = process.env.MAILOSAUR_SERVER_ID!

test.describe('Authentication Flows', () => {
  test('user can sign in with email and code', async ({ page }) => {
    await page.goto(process.env.TEST_APP_URL!)
    await page.click('[data-testid="sign-in-button"]')

    // Wait for Kinde sign-in page
    await expect(page).toHaveURL(/kinde\.com/)

    // Fill sign-in form
    await page.fill('input[name="p_email"]', process.env.TEST_USER_EMAIL!)
    await page.click('button[type="submit"]')

    // Wait for OTP email
    const email = await mailosaur.messages.get(serverId, {
      sentTo: process.env.TEST_USER_EMAIL!,
    })

    // Extract 6-digit OTP code from email
    const otpMatch = email.text?.body?.match(/\b(\d{6})\b/)
    const otpCode = otpMatch?.[1]

    if (!otpCode) {
      throw new Error('Could not extract OTP code from email')
    }

    // Enter OTP
    await page.fill('input[name="p_confirmation_code"]', otpCode)
    await page.click('button[type="submit"]')

    // Wait for successful auth
    const appUrl = new URL(process.env.TEST_APP_URL!)
    await expect(page).toHaveURL(
      new RegExp(appUrl.hostname.replace('.', '\\.'))
    )
    await expect(page.locator('[data-testid="user-profile"]')).toBeVisible()

    // Save state
    await page.context().storageState({ path: 'playwright/.auth/user.json' })

    // Clean up - delete the email
    await mailosaur.messages.del(email.id!)
  })
})
