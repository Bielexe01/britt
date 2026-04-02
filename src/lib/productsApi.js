async function request(url, options) {
  const response = await fetch(url, options);

  if (!response.ok) {
    let message = 'Nao foi possivel concluir a operacao.';

    try {
      const data = await response.json();
      if (typeof data?.message === 'string') {
        message = data.message;
      }
    } catch {
      // Ignore JSON parsing errors and keep fallback message.
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export function fetchProducts() {
  return request('/api/products');
}

export function createProduct(formData) {
  return request('/api/products', {
    method: 'POST',
    body: formData,
  });
}

export function updateProduct(productId, formData) {
  return request(`/api/products/${productId}`, {
    method: 'PUT',
    body: formData,
  });
}

export function deleteProduct(productId) {
  return request(`/api/products/${productId}`, {
    method: 'DELETE',
  });
}
