async function loadFoods() {
  const res = await fetch('/foods');
  const data = await res.json();
  const list = document.getElementById('foodList');
  list.innerHTML = '';
  data.forEach(f => {
    const li = document.createElement('li');
    li.textContent = `${f.name}: ${f.ingredients}`;
    list.appendChild(li);
  });
}

document.getElementById('foodForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('name').value.trim();
  const ingredients = document.getElementById('ingredients').value.trim();
  if (!name || !ingredients) return;
  await fetch('/foods', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, ingredients })
  });
  e.target.reset();
  loadFoods();
});

loadFoods();
