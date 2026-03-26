# Onyx Setup Guide

Follow these steps **in order** to connect Clerk and Convex authentication.

## Phase 1: Clerk Dashboard Setup

1. **Create a Clerk Account**: Go to [clerk.com](https://clerk.com) and create an account
2. **Create a New Application**: 
   - Name it "Onyx" or similar
   - Choose your preferred authentication methods (Email, Google, etc.)
3. **Create JWT Template**:
   - Go to **Configure > JWT Templates**
   - Click **New Template** and select **Convex**
   - Name: Keep it exactly as `convex` (this must match auth.config.ts)
   - Copy the **Issuer URL** (looks like `https://clerk.your-domain.com`)
4. **Get Your Publishable Key**:
   - Go to **API Keys** in your Clerk dashboard
   - Copy the **Publishable Key** (starts with `pk_test_...`)

## Phase 2: Convex Setup

1. **Update auth.config.ts**:
   ```bash
   # Edit convex/auth.config.ts and replace the domain with your Clerk Issuer URL
   ```

2. **Initialize Convex**:
   ```bash
   npx convex dev
   ```
   - Follow the prompts to create/link a Convex project
   - Copy the generated `NEXT_PUBLIC_CONVEX_URL`

## Phase 3: Environment Variables

Update your `.env.local` file:

```env
# From Convex (npx convex dev)
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# From Clerk Dashboard > API Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

## Phase 4: Test Authentication

1. **Restart your dev server**:
   ```bash
   npm run dev
   ```

2. **Test the flow**:
   - Open http://localhost:3000
   - Click "Sign In" in the sidebar
   - Create an account/sign in
   - Click "New Page" to test document creation
   - Verify documents appear in the sidebar

## Troubleshooting

### "Not authenticated" errors
- Check that your JWT template name is exactly `convex`
- Verify the Issuer URL in `auth.config.ts` matches Clerk
- Run `npx convex dev` to sync auth config

### "Module not found" errors
- Make sure all packages are installed: `npm install`
- Restart your dev server

### Environment variables not working
- Ensure `.env.local` is in the project root
- Restart Next.js dev server after adding env vars
- Check that env var names are exactly as shown above

## Next Steps

Once authentication is working:
1. Add BlockNote editor for rich text editing
2. Implement real-time collaboration
3. Add file uploads and images
4. Deploy to production

## File Structure

```
convex/
├── auth.config.ts          # Clerk authentication config
├── schema.ts               # Database schema
├── documents.ts            # Document CRUD operations
└── _generated/             # Auto-generated types

src/
├── components/
│   ├── auth/
│   │   └── user-button.tsx # Sign in/out button
│   ├── providers/
│   │   └── convex-client-provider.tsx # Auth provider wrapper
│   └── sidebar/
│       └── document-sidebar.tsx # Main navigation
└── middleware.ts           # Route protection
```