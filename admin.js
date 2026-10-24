const configuredApiUrl = String(window.APEXFIT_API_URL || '').trim().replace(/\/+$/, '');
const API_URL = configuredApiUrl || (['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? `${window.location.protocol}//${window.location.hostname}:3000`
  : window.location.origin);
const tokenKey = 'apex_admin_token';
const orderStatuses = ['PENDING', 'PAYMENT_PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'FAILED', 'RESERVED'];
const loginPanel = document.getElementById('loginPanel');
const adminPanel = document.getElementById('adminPanel');
const loginError = document.getElementById('loginError');
const adminNotice = document.getElementById('adminNotice');
const siteHeader = document.getElementById('siteHeader');
const adminHeader = document.getElementById('adminHeader');
let products = [];
let categories = [];
let advertisements = [];

function formatKZ(value) {
  return `${Number(value || 0).toLocaleString('pt-AO')} KZ`;
}

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined && text !== null) node.textContent = text;
  if (className) node.className = className;
  return node;
}

async function api(path, options = {}) {
  if (window.location.hostname.endsWith('github.io') && !configuredApiUrl) {
    throw new Error('A API ainda não está configurada. Defina o endereço do servidor em src/api-config.js e publique novamente o site.');
  }
  const headers = new Headers(options.headers || {});
  const token = sessionStorage.getItem(tokenKey);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`O endereço da API (${API_URL}) devolveu uma página em vez de JSON. Confirme o endereço do servidor da API.`);
  }
  const result = await response.json();
  if (response.status === 401 && path !== '/api/admin/login') {
    sessionStorage.removeItem(tokenKey);
    showLogin();
  }
  if (!response.ok) throw new Error(result.message || 'Não foi possível concluir a operação');
  return result;
}

function setNotice(message, isError = false) {
  adminNotice.textContent = message;
  adminNotice.className = isError ? 'small text-danger' : 'small text-success';
}

function showLogin() {
  siteHeader.classList.remove('d-none');
  adminHeader.classList.add('d-none');
  loginPanel.classList.remove('d-none');
  adminPanel.classList.add('d-none');
  document.getElementById('adminActions').classList.add('d-none');
}

function showAdmin(email) {
  siteHeader.classList.add('d-none');
  adminHeader.classList.remove('d-none');
  loginPanel.classList.add('d-none');
  adminPanel.classList.remove('d-none');
  document.getElementById('adminActions').classList.remove('d-none');
  document.getElementById('adminIdentity').textContent = email;
}

document.getElementById('loginForm').addEventListener('submit', async event => {
  event.preventDefault();
  loginError.textContent = '';
  try {
    const result = await api('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({
        email: document.getElementById('loginEmail').value,
        password: document.getElementById('loginPassword').value
      })
    });
    sessionStorage.setItem(tokenKey, result.token);
    document.getElementById('loginPassword').value = '';
    showAdmin(result.email);
    await loadAdmin();
  } catch (error) {
    loginError.textContent = error.message;
  }
});

document.getElementById('logoutButton').addEventListener('click', () => {
  sessionStorage.removeItem(tokenKey);
  showLogin();
});

document.getElementById('refreshButton').addEventListener('click', () => loadAdmin().catch(error => setNotice(error.message, true)));
document.getElementById('newProductButton').addEventListener('click', () => openProductForm());
document.getElementById('cancelProductButton').addEventListener('click', () => closeProductForm());
document.getElementById('productName').addEventListener('input', event => {
  const slugInput = document.getElementById('productSlug');
  if (!slugInput.dataset.edited) slugInput.value = slugify(event.target.value);
});
document.getElementById('productSlug').addEventListener('input', event => {
  event.target.dataset.edited = event.target.value ? 'true' : '';
});
document.getElementById('newAdvertisementButton').addEventListener('click', () => openAdvertisementForm());
document.getElementById('cancelAdvertisementButton').addEventListener('click', closeAdvertisementForm);

function slugify(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function loadAdmin() {
  setNotice('A carregar dados...');
  try {
    const [dashboard, productList, orderList, messageList, categoryList, advertisementList] = await Promise.all([
      api('/api/admin/dashboard'),
      api('/api/admin/products'),
      api('/api/admin/orders'),
      api('/api/admin/messages'),
      api('/api/categories'),
      api('/api/admin/advertisements')
    ]);
    products = productList;
    categories = categoryList;
    advertisements = advertisementList;
    renderDashboard(dashboard);
    renderProducts();
    renderOrders(orderList);
    renderMessages(messageList);
    renderAdvertisements();
    renderCategories();
    setNotice('Dados atualizados.');
  } catch (error) {
    setNotice(error.message, true);
    throw error;
  }
}

function renderDashboard(data) {
  document.getElementById('salesTotal').textContent = formatKZ(data.sales?.total);
  document.getElementById('orderTotal').textContent = Number(data.sales?.orders || 0).toLocaleString('pt-AO');
  document.getElementById('productTotal').textContent = Number(data.products?.total || 0).toLocaleString('pt-AO');
  document.getElementById('messageTotal').textContent = Number(data.messages?.total || 0).toLocaleString('pt-AO');
}

function renderCategories() {
  const select = document.getElementById('productCategory');
  select.replaceChildren(...categories.map(category => {
    const option = element('option', category.name);
    option.value = category.id;
    return option;
  }));
}

function renderProducts() {
  const body = document.getElementById('productsTable');
  body.replaceChildren();
  if (!products.length) {
    const row = element('tr');
    const cell = element('td', 'Ainda não há produtos.', 'text-center text-secondary py-4');
    cell.colSpan = 6;
    row.append(cell);
    body.append(row);
    return;
  }
  for (const product of products) {
    const row = element('tr');
    const productCell = element('td');
    const productWrap = element('div', undefined, 'd-flex align-items-center gap-2');
    const image = element('img', undefined, 'product-thumb');
    image.src = product.image_url || 'https://placehold.co/80x80/e8ece7/18211f?text=AF';
    image.alt = '';
    const details = element('div');
    details.append(element('div', product.name, 'fw-semibold'));
    details.append(element('small', product.slug, 'text-secondary'));
    productWrap.append(image, details);
    productCell.append(productWrap);
    row.append(productCell);
    row.append(element('td', product.category_name));
    row.append(element('td', formatKZ(product.price)));
    row.append(element('td', String(product.stock)));
    row.append(element('td', product.active ? 'Ativo' : 'Inativo', product.active ? 'text-success' : 'text-secondary'));
    const actions = element('td', undefined, 'text-end text-nowrap');
    const editButton = element('button', undefined, 'btn btn-sm btn-outline-dark me-1');
    editButton.type = 'button';
    editButton.title = 'Editar produto';
    editButton.innerHTML = '<i class="fa-solid fa-pen"></i>';
    editButton.addEventListener('click', () => openProductForm(product));
    actions.append(editButton);
    if (product.active) {
      const deactivateButton = element('button', undefined, 'btn btn-sm btn-outline-danger');
      deactivateButton.type = 'button';
      deactivateButton.title = 'Desativar produto';
      deactivateButton.innerHTML = '<i class="fa-solid fa-box-archive"></i>';
      deactivateButton.addEventListener('click', () => deactivateProduct(product));
      actions.append(deactivateButton);
    }
    row.append(actions);
    body.append(row);
  }
}

function renderOrders(orders) {
  const body = document.getElementById('ordersTable');
  body.replaceChildren();
  if (!orders.length) {
    const row = element('tr');
    const cell = element('td', 'Ainda não há encomendas.', 'text-center text-secondary py-4');
    cell.colSpan = 7;
    row.append(cell);
    body.append(row);
    return;
  }
  for (const order of orders) {
    const row = element('tr');
    row.append(element('td', order.order_number, 'fw-semibold'));
    const customerCell = element('td');
    customerCell.append(element('div', order.customer_name));
    customerCell.append(element('small', order.customer_email, 'text-secondary'));
    row.append(customerCell);
    row.append(element('td', (order.items || []).map(item => `${item.product_name} x${item.quantity}`).join(', ')));
    row.append(element('td', formatKZ(order.total)));
    row.append(element('td', `${order.payment_method} / ${order.payment_status || 'PENDENTE'}`));
    const statusCell = element('td');
    const statusSelect = element('select', undefined, 'form-select form-select-sm');
    for (const status of orderStatuses) {
      const option = element('option', status);
      option.value = status;
      option.selected = status === order.status;
      option.disabled = status === 'RESERVED' && order.status !== 'RESERVED';
      statusSelect.append(option);
    }
    statusCell.append(statusSelect);
    row.append(statusCell);
    const actionCell = element('td');
    const saveButton = element('button', 'Guardar', 'btn btn-sm btn-outline-success');
    saveButton.type = 'button';
    saveButton.addEventListener('click', async () => {
      saveButton.disabled = true;
      try {
        await api(`/api/admin/orders/${order.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: statusSelect.value })
        });
        setNotice(`Pedido ${order.order_number} atualizado.`);
        await loadAdmin();
      } catch (error) {
        setNotice(error.message, true);
      } finally {
        saveButton.disabled = false;
      }
    });
    actionCell.append(saveButton);
    row.append(actionCell);
    body.append(row);
  }
}

function renderAdvertisements() {
  const body = document.getElementById('advertisementsTable');
  body.replaceChildren();
  if (!advertisements.length) {
    const row = element('tr');
    const cell = element('td', 'Ainda não há campanhas publicitárias.', 'text-center text-secondary py-4');
    cell.colSpan = 4;
    row.append(cell);
    body.append(row);
    return;
  }
  for (const ad of advertisements) {
    const row = element('tr');
    const campaign = element('td');
    campaign.append(element('div', `${ad.company_name} · ${ad.title}`, 'fw-semibold'));
    campaign.append(element('small', ad.description || '', 'text-secondary'));
    row.append(campaign);
    row.append(element('td', `${new Date(ad.starts_at).toLocaleString('pt-AO')} – ${new Date(ad.ends_at).toLocaleString('pt-AO')}`));
    row.append(element('td', ad.active ? 'Ativa / agendada' : 'Inativa', ad.active ? 'text-success' : 'text-secondary'));
    const actions = element('td', undefined, 'text-end text-nowrap');
    const edit = element('button', 'Editar', 'btn btn-sm btn-outline-dark me-1');
    edit.type = 'button';
    edit.addEventListener('click', () => openAdvertisementForm(ad));
    actions.append(edit);
    if (ad.active) {
      const deactivate = element('button', 'Desativar', 'btn btn-sm btn-outline-danger');
      deactivate.type = 'button';
      deactivate.addEventListener('click', () => deactivateAdvertisement(ad));
      actions.append(deactivate);
    }
    row.append(actions);
    body.append(row);
  }
}

function renderMessages(messages) {
  const body = document.getElementById('messagesTable');
  body.replaceChildren();
  if (!messages.length) {
    const row = element('tr');
    const cell = element('td', 'Ainda não há mensagens.', 'text-center text-secondary py-4');
    cell.colSpan = 6;
    row.append(cell);
    body.append(row);
    return;
  }
  for (const message of messages) {
    const row = element('tr');
    row.append(element('td', new Date(message.created_at).toLocaleString('pt-AO')));
    row.append(element('td', message.name));
    row.append(element('td', message.email));
    row.append(element('td', message.subject || 'Sem assunto'));
    row.append(element('td', message.message));
    row.append(element('td', message.status));
    body.append(row);
  }
}

function openProductForm(product = null) {
  const form = document.getElementById('productForm');
  form.classList.remove('d-none');
  document.getElementById('productId').value = product?.id || '';
  document.getElementById('productName').value = product?.name || '';
  document.getElementById('productSlug').value = product?.slug || '';
  document.getElementById('productSlug').dataset.edited = product ? 'true' : '';
  document.getElementById('productCategory').value = product?.category_id || categories[0]?.id || '';
  document.getElementById('productPrice').value = product?.price || '';
  document.getElementById('productStock').value = product?.stock ?? 0;
  document.getElementById('productImage').value = product?.image_url || '';
  document.getElementById('productDescription').value = product?.description || '';
  document.getElementById('productActive').checked = product ? Boolean(product.active) : true;
  document.getElementById('productFeatured').checked = Boolean(product?.featured);
  document.getElementById('productsHeading').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeProductForm() {
  document.getElementById('productForm').reset();
  document.getElementById('productForm').classList.add('d-none');
  document.getElementById('productId').value = '';
  document.getElementById('productSlug').dataset.edited = '';
  document.getElementById('productImageFile').value = '';
}

document.getElementById('productForm').addEventListener('submit', async event => {
  event.preventDefault();
  const id = document.getElementById('productId').value;
  const payload = {
    name: document.getElementById('productName').value,
    slug: document.getElementById('productSlug').value,
    categoryId: Number(document.getElementById('productCategory').value),
    price: Number(document.getElementById('productPrice').value),
    stock: Number(document.getElementById('productStock').value),
    imageUrl: document.getElementById('productImage').value,
    description: document.getElementById('productDescription').value,
    active: document.getElementById('productActive').checked,
    featured: document.getElementById('productFeatured').checked
  };
  try {
    const imageFile = document.getElementById('productImageFile').files[0];
    if (imageFile) payload.imageUrl = await uploadImage(imageFile);
    await api(id ? `/api/admin/products/${id}` : '/api/admin/products', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(payload)
    });
    closeProductForm();
    await loadAdmin();
    setNotice(id ? 'Produto atualizado.' : 'Produto criado.');
  } catch (error) {
    setNotice(error.message, true);
  }
});

async function uploadImage(file) {
  const body = new FormData();
  body.append('image', file);
  const result = await api('/api/admin/uploads', { method: 'POST', body });
  return new URL(result.imageUrl, API_URL).toString();
}

function localDateTime(value) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

function openAdvertisementForm(ad = null) {
  const form = document.getElementById('advertisementForm');
  form.classList.remove('d-none');
  document.getElementById('advertisementId').value = ad?.id || '';
  document.getElementById('advertisementCompany').value = ad?.company_name || '';
  document.getElementById('advertisementTitle').value = ad?.title || '';
  document.getElementById('advertisementImage').value = ad?.image_url || '';
  document.getElementById('advertisementTarget').value = ad?.target_url || '';
  document.getElementById('advertisementDescription').value = ad?.description || '';
  document.getElementById('advertisementStarts').value = ad ? localDateTime(ad.starts_at) : localDateTime(new Date());
  document.getElementById('advertisementEnds').value = ad ? localDateTime(ad.ends_at) : localDateTime(new Date(Date.now() + 7 * 86400000));
  document.getElementById('advertisementActive').checked = ad ? Boolean(ad.active) : true;
  document.getElementById('advertisementsHeading').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeAdvertisementForm() {
  document.getElementById('advertisementForm').reset();
  document.getElementById('advertisementForm').classList.add('d-none');
  document.getElementById('advertisementId').value = '';
  document.getElementById('advertisementImageFile').value = '';
}

document.getElementById('advertisementForm').addEventListener('submit', async event => {
  event.preventDefault();
  const id = document.getElementById('advertisementId').value;
  try {
    let imageUrl = document.getElementById('advertisementImage').value.trim();
    const imageFile = document.getElementById('advertisementImageFile').files[0];
    if (imageFile) imageUrl = await uploadImage(imageFile);
    const payload = {
      companyName: document.getElementById('advertisementCompany').value,
      title: document.getElementById('advertisementTitle').value,
      description: document.getElementById('advertisementDescription').value,
      imageUrl,
      targetUrl: document.getElementById('advertisementTarget').value,
      startsAt: document.getElementById('advertisementStarts').value,
      endsAt: document.getElementById('advertisementEnds').value,
      active: document.getElementById('advertisementActive').checked
    };
    await api(id ? `/api/admin/advertisements/${id}` : '/api/admin/advertisements', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(payload)
    });
    closeAdvertisementForm();
    await loadAdmin();
    setNotice(id ? 'Publicidade atualizada.' : 'Publicidade criada e agendada.');
  } catch (error) {
    setNotice(error.message, true);
  }
});

async function deactivateAdvertisement(ad) {
  if (!window.confirm(`Desativar a campanha "${ad.title}"?`)) return;
  try {
    await api(`/api/admin/advertisements/${ad.id}`, { method: 'DELETE' });
    await loadAdmin();
    setNotice('Publicidade desativada.');
  } catch (error) {
    setNotice(error.message, true);
  }
}

async function deactivateProduct(product) {
  if (!window.confirm(`Desativar "${product.name}"? O artigo deixa de aparecer na loja.`)) return;
  try {
    await api(`/api/admin/products/${product.id}`, { method: 'DELETE' });
    await loadAdmin();
    setNotice('Produto desativado.');
  } catch (error) {
    setNotice(error.message, true);
  }
}

async function restoreSession() {
  const token = sessionStorage.getItem(tokenKey);
  if (!token) return showLogin();
  try {
    const session = await api('/api/admin/session');
    showAdmin(session.email);
    await loadAdmin();
  } catch {
    sessionStorage.removeItem(tokenKey);
    showLogin();
  }
}

restoreSession();