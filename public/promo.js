// Sharing is triggered by the player. Delegation also covers the game's rerendered dashboard.
document.addEventListener("click", async event => {
  const button = event.target.closest("[data-share-game]");
  if (!button || button.disabled) return;
  const english = document.documentElement.lang === "en";
  const status = button.parentElement.querySelector("[data-share-status]") ||
    document.querySelector("[data-share-status]");
  const say = message => { if (status) status.textContent = message; };
  const expedition = button.dataset.shareGame === "expedition";
  const url = new URL(expedition ? "/expedition.html" : "/discover.html", location.origin);
  url.searchParams.set("utm_source", "player");
  url.searchParams.set("utm_medium", "share");
  if (expedition) url.searchParams.set("utm_campaign", "first_colony");
  const text = expedition
    ? "Orbital Foundry: Teste deine erste Kolonie / Try your first colony."
    : "Orbital Foundry: Kostenloses Weltraum-Strategiespiel / Free browser space strategy.";
  button.disabled = true;
  try {
    if (navigator.share) {
      await navigator.share({ title: "Orbital Foundry", text, url: url.href });
      say(english ? "Sharing window completed." : "Teilen abgeschlossen.");
    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url.href);
      say(english ? "Invite link copied." : "Einladungslink kopiert.");
    } else {
      say((english ? "Copy this link: " : "Diesen Link kopieren: ") + url.href);
    }
  } catch (error) {
    if (error.name !== "AbortError") say((english ? "Copy this link: " : "Diesen Link kopieren: ") + url.href);
  } finally {
    button.disabled = false;
  }
});
