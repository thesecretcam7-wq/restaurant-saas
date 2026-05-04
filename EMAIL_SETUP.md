# Email Notifications Setup Guide

This guide explains how to set up email notifications for your Restaurant SaaS application.

## Overview

The application includes email notification templates for:
- ✅ Order confirmation (customer)
- ✅ Order status updates (customer)
- ✅ Admin notifications for new orders

All email templates are located in `lib/email/templates.ts` and the sending logic is in `lib/email/send.ts`.

## Setup Options

### Option 1: Using Resend (Recommended for Startups)

[Resend](https://resend.com) is the easiest way to send transactional emails. It's reliable, affordable, and integrates in minutes.

#### Steps:

1. **Sign up for Resend**
   - Go to https://resend.com
   - Create a free account
   - Get your API key from the dashboard

2. **Add your domain** (Optional but recommended)
   - In Resend dashboard, add your custom domain
   - Follow DNS verification steps
   - This improves email deliverability

3. **Set environment variables**
   ```env
   RESEND_API_KEY=re_xxxxxxxxxxxx
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   # If using default domain:
   RESEND_FROM_EMAIL=onboarding@resend.dev
   ```

4. **Deploy to Vercel**
   - Push to GitHub
   - Vercel will automatically deploy
   - Add environment variables in Vercel dashboard

5. **Test email sending**
   - Create an order in admin
   - Check customer email inbox
   - Check spam folder if not received

### Option 2: Using SendGrid

If you prefer SendGrid, modify `lib/email/send.ts`:

```typescript
export async function sendEmail(to: string, subject: string, html: string) {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: process.env.SENDGRID_FROM_EMAIL },
      subject,
      content: [{ type: 'text/html', value: html }],
    }),
  })
  // ... handle response
}
```

### Option 3: Using AWS SES

For high-volume applications, AWS SES is cost-effective:

```typescript
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'

const sesClient = new SESClient({ region: process.env.AWS_REGION })

export async function sendEmail(to: string, subject: string, html: string) {
  const command = new SendEmailCommand({
    Source: process.env.AWS_SES_FROM_EMAIL,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject },
      Body: { Html: { Data: html } },
    },
  })
  return sesClient.send(command)
}
```

## Integrating Email with Webhooks

Emails are automatically sent when:

1. **Order is created** (checkout completes)
   - Customer receives order confirmation
   - Admin receives notification

2. **Order status is updated**
   - Customer receives status update
   - Status changes: pending → confirmed → preparing → on_the_way → delivered

To enable this, update the webhook handler (`app/api/stripe/webhook/route.ts`):

```typescript
import { sendOrderConfirmationEmail } from '@/lib/email/send'

case 'checkout.session.completed': {
  const session = event.data.object as Stripe.Checkout.Session
  const { order_id } = session.metadata || {}

  // Get order details
  const order = await supabase
    .from('orders')
    .select('*')
    .eq('id', order_id)
    .single()

  // Send confirmation email
  if (order.data.customer_email) {
    await sendOrderConfirmationEmail(
      order.data.customer_email,
      order.data.customer_name,
      order.data.order_number,
      order.data.items,
      order.data.subtotal,
      order.data.tax,
      order.data.delivery_fee,
      order.data.total,
      restaurantName,
      order.data.delivery_type
    )
  }
  break
}
```

## Email Template Customization

To customize email templates, edit `lib/email/templates.ts`:

```typescript
export function orderConfirmationEmail(
  customerName: string,
  orderNumber: string,
  // ... other params
): EmailTemplate {
  return {
    subject: `Order #${orderNumber} - Your Custom Subject`,
    html: `<html>Your custom HTML</html>`
  }
}
```

## Testing Emails Locally

### Without Email Service (Development)

If `RESEND_API_KEY` is not set, emails are logged to console:

```bash
[Email] To: customer@example.com, Subject: Order Confirmation
```

This allows testing without setting up email service.

### With Email Service

1. Set environment variables locally:
   ```bash
   export RESEND_API_KEY=re_xxxxxxxxxxxx
   export RESEND_FROM_EMAIL=noreply@example.com
   ```

2. Run development server:
   ```bash
   npm run dev
   ```

3. Create an order in admin dashboard

4. Check your email (and spam folder)

## Production Checklist

- [ ] Resend account created and API key obtained
- [ ] Custom domain configured in Resend (optional but recommended)
- [ ] `RESEND_API_KEY` added to Vercel environment variables
- [ ] `RESEND_FROM_EMAIL` added to Vercel environment variables
- [ ] Test order created and email received
- [ ] SPF/DKIM records configured (if using custom domain)
- [ ] Email footer includes restaurant contact info
- [ ] Admin receives notifications for new orders
- [ ] Customers receive status updates

## Troubleshooting

### Emails not being sent

1. **Check API Key**
   ```bash
   echo $RESEND_API_KEY  # Should output your key
   ```

2. **Check logs in Vercel**
   - Go to Vercel dashboard
   - Select your project
   - View function logs
   - Look for email errors

3. **Check Resend dashboard**
   - Go to https://resend.com/emails
   - View sent/failed emails
   - Check bounces and complaints

4. **Verify customer email**
   - Make sure customer email is valid
   - Check for typos in order form

### Emails going to spam

1. **Add SPF record** (if using custom domain)
   - In Resend: copy SPF record
   - Add to your DNS provider
   - Wait 24-48 hours for DNS propagation

2. **Add DKIM record**
   - In Resend: copy DKIM record
   - Add to your DNS provider
   - Wait for verification

3. **Use branded domain**
   - Instead of `onboarding@resend.dev`
   - Use `noreply@yourdomain.com`
   - Improves deliverability significantly

4. **Check email content**
   - Avoid too many links
   - Avoid suspicious words
   - Include unsubscribe option (for marketing)

## Sending Test Emails

To test email sending programmatically:

```typescript
// app/api/email/test/route.ts
import { sendOrderConfirmationEmail } from '@/lib/email/send'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    await sendOrderConfirmationEmail(
      email,
      'Test Customer',
      'TEST-12345',
      [{ name: 'Pizza Pepperoni', qty: 1, price: 25000 }],
      25000,
      3750,
      5000,
      33750,
      'Test Restaurant',
      'delivery',
      '30 minutos'
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 })
  }
}
```

Then test with:
```bash
curl -X POST http://localhost:3000/api/email/test \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@example.com"}'
```

## Email Rate Limits

- **Resend Free**: 100 emails/day
- **Resend Paid**: Unlimited (pay per email)
- **SendGrid Free**: 100 emails/day
- **AWS SES**: 50,000 emails/day (in sandbox) or unlimited (production)

For MVP, Resend free tier should be sufficient. Upgrade when you reach volume limits.

## Next Steps

1. Choose email service (Resend recommended)
2. Set up account and get API key
3. Add environment variables to Vercel
4. Deploy and test
5. Monitor email delivery in service dashboard
6. Customize templates as needed

## Support

For issues:
- Resend Support: https://resend.com/support
- SendGrid Support: https://sendgrid.com/support
- AWS SES Documentation: https://docs.aws.amazon.com/ses/
