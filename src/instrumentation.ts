/** Runs once when the server starts: reports whether it found the WhatsApp group folder. */
export async function register() {
  if (process.env["NEXT_RUNTIME"] === "nodejs") {
    const { logInvitesFolder } = await import("./instrumentation-node");
    await logInvitesFolder();
  }
}
