document.getElementById('show-password').addEventListener('change', function () {
  document.getElementById('password-input').type = this.checked ? 'text' : 'password';
});
const updateEntryCopy = () => {
  const key = document.documentElement.lang.startsWith('en') ? 'entryEn' : 'entryDe';
  document.querySelectorAll('[data-entry-de]').forEach(element => { element.textContent = element.dataset[key]; });
};
document.addEventListener('orbital-language-change', updateEntryCopy);
updateEntryCopy();
