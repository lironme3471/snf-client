# How to get your login token (for accounts with MFA)

**Why you need this:** the tool can't ask you for an MFA code, so it can't log you in with just an email and password. Instead, you log in to NICE in your browser (where MFA works), copy a temporary "token" that proves you are logged in, and paste it into the tool.

**Time needed:** about 3 minutes. **Browser:** Google Chrome or Microsoft Edge (steps are the same in both).

> Treat the token like a password. Anyone who has it can act as you until it expires. Don't email it or post it in chat.

---

## Part 1 – Log in to NICE

1. Open a new browser tab and go to the NICE CXone login page for your environment (production, staging or test – use the one you want the tool to work with).
2. Log in with your email and password, then enter your MFA code.
3. Wait until you see the NICE CXone home page.

## Part 2 – Open the browser's developer panel

Stay on the NICE page and open the panel (it looks technical, but you only need to read one line from it):

- **Windows:** press **F12**
- **Mac:** press **Cmd + Option + I**

A panel opens on the right or bottom of the window.

## Part 3 – Find the token

1. At the top of the panel, click the **Network** tab. (If you don't see it, click the **>>** arrow and choose it.)
2. Press **F5** (Mac: **Cmd + R**) to reload the NICE page. A list of lines will fill in.
3. In the small **Filter** box, type: `api`
4. Click on any line in the list.
5. On the right, click the **Headers** tab.
6. Scroll down to the section called **Request Headers**.
7. Find the line that starts with **authorization**. It looks like this:

   `authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6...` (a very long text)

   If the line you clicked has no `authorization` line, click a different line from the list and look again.

8. **Right-click the long text after the word `Bearer`** and choose **Copy value**. (Copying "Bearer" along with it is fine too – the tool accepts both.)

## Part 4 – Paste it into the tool

1. Open the tool and click **Log in**.
2. Click **Advanced: paste token manually** (small underlined text at the bottom of the window).
3. Click into the **Bearer token** box and paste (**Ctrl + V**, Mac: **Cmd + V**).
4. Click the login button.

You're in.

---

## Troubleshooting

| What you see | What to do |
| --- | --- |
| The tool says "Paste a valid bearer token" | The box was empty or the copy didn't work. Repeat Part 3, step 8. |
| It worked, then stopped working after a while | The token has expired. Repeat the steps to get a fresh one. |
| You can't find any `authorization` line | Make sure you reloaded the page (Part 3, step 2) with the Network tab already open, and try a few different lines. |
| The tool accepts the token but shows permission errors | Check that you logged in to the same environment (prod / staging / test) that the tool is set to. |
