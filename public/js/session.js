// Who is shopping. The demo has no sign-in form: a shopper id is assigned on
// first visit and kept for the tab, like a remembered login.
const KEY = "shop.user";

export function currentUser() {
  let id = sessionStorage.getItem(KEY);
  if (!id) {
    id = `u_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(KEY, id);
  }
  return id;
}
