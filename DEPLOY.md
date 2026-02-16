# How to Deploy SkillProbe Pro

You have two main options to deploy this app: **Firebase Hosting** (recommended since you are using Firebase Auth) or **Vercel**.

## Option 1: Firebase Hosting (Recommended)

Since you already set up a Firebase project, this is the easiest path.

### Prerequisites
1. Install Node.js (LTS version) on your computer.
2. Open your terminal/command prompt.

### Steps

1. **Install the Firebase CLI**
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Google**
   ```bash
   firebase login
   ```

3. **Initialize the Project**
   Inside your project folder, run:
   ```bash
   firebase init hosting
   ```
   - Select **"Use an existing project"** and choose `skillprobe-app` (or whatever you named it).
   - What do you want to use as your public directory? Type: `dist`
   - Configure as a single-page app? Type: `y`
   - Set up automatic builds and deploys with GitHub? Type: `n` (you can do this later).

4. **Install Dependencies & Build**
   ```bash
   npm install
   npm run build
   ```
   *Note: This creates a `dist` folder with your production website.*

5. **Deploy**
   ```bash
   firebase deploy --only hosting
   ```

You will get a URL like `https://skillprobe-app.web.app`. Your app is now live!

---

## Option 2: Vercel (Fastest Alternative)

1. Push this code to a GitHub repository.
2. Go to [vercel.com](https://vercel.com) and sign up/login.
3. Click **"Add New Project"** and import your GitHub repo.
4. Vercel will detect it's a Vite project.
5. **Important:** Add your Environment Variables in the Vercel Dashboard settings:
   - `API_KEY`: Your Gemini API Key

6. Click **Deploy**.

---

## Important Security Note

Currently, your Gemini `API_KEY` is bundled in the frontend.
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Click on your API Key.
3. Under **"API restrictions"**, usually you would select "Restrict key usage".
4. However, Gemini keys for web use are tricky. Ideally, you should move the API calls to a **Backend** (like Firebase Functions) in the future to keep the key truly hidden.
5. For now, to prevent theft, ensure you add **HTTP referer restrictions** in the Google Cloud Console to only allow your hosted domain (e.g., `https://skillprobe-app.web.app/*`).
