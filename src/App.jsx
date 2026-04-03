import React, { useEffect, useRef, useState } from 'react';
import {
  ShoppingBag,
  X,
  Menu,
  Lock,
  LogOut,
  Camera,
  Music2,
  ArrowRight,
  Star,
  Minus,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Grip,
} from 'lucide-react';
import { createProduct, deleteProduct, fetchProducts, updateProduct } from './lib/productsApi';

const CUSTOM_LOGO_URL = '/img/logo.jpeg';
const FALLBACK_LOGO_URL = "https://placehold.co/420x140/09090b/c4b5fd?text=B'RITT";
const HERO_IMAGE_URL =
  '/img/fundo.png';
const DEFAULT_PRODUCT_IMAGE =
  'https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&q=80&w=900';
const MAX_IMAGES_PER_PRODUCT = 8;
const MOBILE_BREAKPOINT = 1024;
const PRODUCT_SWIPE_THRESHOLD = 36;
const MODAL_DRAG_CLOSE_THRESHOLD = 120;
const WHATSAPP_PHONE_NUMBER = String(import.meta.env.VITE_WHATSAPP_PHONE_NUMBER ?? '').replace(/\D/g, '');
const ADMIN_USERNAME = String(import.meta.env.VITE_ADMIN_USERNAME ?? 'admin').trim();
const ADMIN_PASSWORD = String(import.meta.env.VITE_ADMIN_PASSWORD ?? 'britt2026').trim();
const ADMIN_SESSION_STORAGE_KEY = 'britt-admin-authenticated';

const priceFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const DEFAULT_PRODUCTS = [
  {
    id: 1,
    name: "T-Shirt Oversized b'ritt",
    price: 149.9,
    category: 'Roupas',
    image:
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&q=80&w=800',
    badge: 'Mais vendido',
    description:
      'Camiseta oversized com malha encorpada, estampa frontal minimalista e acabamento premium para o dia a dia.',
    details: ['Modelagem ampla', '100% algodao', 'Drop oficial 2026'],
  },
  {
    id: 2,
    name: 'Moletom Heavy Tour',
    price: 289.9,
    category: 'Roupas',
    image:
      'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=800',
    badge: 'Novo',
    description:
      'Moletom pesado com toque macio, capuz estruturado e arte inspirada na nova fase da turne.',
    details: ['Moletom heavy', 'Forro aconchegante', 'Arte exclusiva'],
  },
  {
    id: 3,
    name: 'Bone Dad Hat Logo',
    price: 89.9,
    category: 'Acessorios',
    image:
      'https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&q=80&w=800',
    badge: '',
    description:
      'Bone ajustavel com bordado frontal e visual limpo para combinar com qualquer look da colecao.',
    details: ['Aba curva', 'Fecho regulavel', 'Bordado frontal'],
  },
  {
    id: 4,
    name: 'Shoulder Bag Midnight',
    price: 119.9,
    category: 'Acessorios',
    image:
      'https://images.unsplash.com/photo-1600850056064-a8b380df8395?auto=format&fit=crop&q=80&w=800',
    badge: '',
    description:
      'Shoulder bag compacta com divisorias internas, visual noturno e acabamento resistente para a rotina.',
    details: ['Compartimentos internos', 'Alca ajustavel', 'Tecido resistente'],
  },
  {
    id: 5,
    name: "Longsleeve Acid b'ritt",
    price: 169.9,
    category: 'Roupas',
    image:
      'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&q=80&w=800',
    badge: '',
    description:
      'Longsleeve com lavagem acid, caimento reto e arte exclusiva inspirada no universo da nova era.',
    details: ['Lavagem acid', 'Manga longa', 'Arte exclusiva'],
  },
  {
    id: 6,
    name: "Vinil Duplo 'A Nova Era'",
    price: 199.9,
    category: 'Musica',
    image:
      'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&q=80&w=800',
    badge: 'Limitado',
    description:
      'Vinil duplo colecionavel com encarte especial, arte expandida e prensagem pensada para fas da banda.',
    details: ['Edicao limitada', 'Encarte especial', 'Colecionavel oficial'],
  },
];

const EMPTY_PRODUCT_FORM = {
  name: '',
  price: '',
  category: '',
  badge: '',
  description: '',
  details: '',
  gallery: [],
};

const EMPTY_ADMIN_LOGIN_FORM = {
  username: '',
  password: '',
};

const inputClassName =
  'w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-sky-400';

function cloneProduct(product) {
  return { ...product, details: [...product.details], images: [...getProductImages(product)] };
}

function createDefaultProducts() {
  return DEFAULT_PRODUCTS.map(cloneProduct).map(normalizeProduct);
}

function normalizeProduct(product, index = 0) {
  const images =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images.map((image) => String(image).trim()).filter(Boolean)
      : product.image
        ? [String(product.image).trim()]
        : [DEFAULT_PRODUCT_IMAGE];

  return {
    id: product.id ?? Date.now() + index,
    name: String(product.name ?? 'Produto sem nome').trim() || 'Produto sem nome',
    price: Math.max(0, Number(product.price) || 0),
    category: String(product.category ?? 'Colecao').trim() || 'Colecao',
    images,
    badge: String(product.badge ?? '').trim(),
    description:
      String(product.description ?? '').trim() || 'Produto oficial da loja com identidade da banda.',
    details:
      Array.isArray(product.details) && product.details.length > 0
        ? product.details.map((detail) => String(detail).trim()).filter(Boolean)
        : ['Produto oficial'],
    createdAt: product.createdAt ?? null,
    updatedAt: product.updatedAt ?? null,
  };
}

function getProductImages(product) {
  return Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : product.image
      ? [product.image]
      : [DEFAULT_PRODUCT_IMAGE];
}

function getPrimaryImage(product) {
  return getProductImages(product)[0] ?? DEFAULT_PRODUCT_IMAGE;
}

function createExistingGalleryItem(url, index) {
  return {
    id: `existing-${index}-${url}`,
    previewUrl: url,
    persistedUrl: url,
    file: null,
    isExisting: true,
  };
}

function formatProductToForm(product) {
  return {
    name: product.name,
    price: String(product.price),
    category: product.category,
    badge: product.badge,
    description: product.description,
    details: product.details.join(', '),
    gallery: getProductImages(product).map((image, index) => createExistingGalleryItem(image, index)),
  };
}

function buildProductPayload(draft) {
  const details = draft.details
    .split(',')
    .map((detail) => detail.trim())
    .filter(Boolean);

  return {
    name: draft.name.trim(),
    price: Math.max(0, Number(draft.price) || 0),
    category: draft.category.trim() || 'Colecao',
    badge: draft.badge.trim(),
    description: draft.description.trim() || 'Produto oficial da loja com identidade da banda.',
    details: details.length > 0 ? details : ['Produto oficial'],
    existingImages: draft.gallery
      .filter((item) => item.isExisting)
      .map((item) => item.persistedUrl)
      .filter(Boolean),
    newImages: draft.gallery.filter((item) => !item.isExisting && item.file),
  };
}

function formatPrice(value) {
  return priceFormatter.format(value);
}

function buildWhatsAppCheckoutMessage(cartItems, total) {
  const orderLines = cartItems.map((item, index) => {
    const itemTotal = item.price * item.quantity;
    return [
      `${index + 1}. ${item.name}`,
      `Quantidade: ${item.quantity}`,
      `Valor unitario: ${formatPrice(item.price)}`,
      `Subtotal: ${formatPrice(itemTotal)}`,
    ].join('\n');
  });

  return [
    "Ola! Quero finalizar este pedido da loja B'RITT:",
    '',
    ...orderLines.flatMap((line) => [line, '']),
    `Total do pedido: ${formatPrice(total)}`,
  ].join('\n');
}

function buildWhatsAppCheckoutUrl(cartItems, total) {
  if (!WHATSAPP_PHONE_NUMBER) {
    return null;
  }

  const message = buildWhatsAppCheckoutMessage(cartItems, total);
  return `https://wa.me/${WHATSAPP_PHONE_NUMBER}?text=${encodeURIComponent(message)}`;
}

function getWrappedImageIndex(currentIndex, imagesLength, step) {
  if (imagesLength <= 0) return 0;
  return (currentIndex + step + imagesLength) % imagesLength;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error(`Nao foi possivel ler o arquivo ${file.name}.`));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

function isMissingProductError(error) {
  return error instanceof Error && error.message === 'Produto nao encontrado.';
}

export default function App() {
  const managerPanelScrollRef = useRef(null);
  const managerFormRef = useRef(null);
  const productNameInputRef = useRef(null);
  const isSubmittingProductRef = useRef(false);
  const removingProductIdRef = useRef(null);
  const modalDragStateRef = useRef({ startY: 0, isDragging: false });
  const productCardTouchStateRef = useRef({});
  const suppressedProductClickRef = useRef({ productId: null, timestamp: 0 });
  const [logoHasError, setLogoHasError] = useState(false);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isManagerPanelOpen, setIsManagerPanelOpen] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isProductsLoading, setIsProductsLoading] = useState(true);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [activeProductImageIndex, setActiveProductImageIndex] = useState(0);
  const [productCardImageIndexes, setProductCardImageIndexes] = useState({});
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT_FORM);
  const [adminLoginForm, setAdminLoginForm] = useState(EMPTY_ADMIN_LOGIN_FORM);
  const [editingProductId, setEditingProductId] = useState(null);
  const [removingProductId, setRemovingProductId] = useState(null);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [modalDragOffset, setModalDragOffset] = useState(0);
  const [toast, setToast] = useState(null);

  const logoSrc = logoHasError ? FALLBACK_LOGO_URL : CUSTOM_LOGO_URL;
  const selectedProduct = products.find((product) => product.id === selectedProductId) ?? null;
  const selectedProductImages = selectedProduct ? getProductImages(selectedProduct) : [];
  const currentProductImageIndex =
    selectedProductImages.length > 0
      ? Math.min(activeProductImageIndex, selectedProductImages.length - 1)
      : 0;
  const activeProductImage = selectedProductImages[currentProductImageIndex] ?? DEFAULT_PRODUCT_IMAGE;
  const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const cartItemsCount = cart.reduce((count, item) => count + item.quantity, 0);
  const categories = ['Todos', ...new Set(products.map((product) => product.category))];
  const currentCategory =
    activeCategory === 'Todos' || products.some((product) => product.category === activeCategory)
      ? activeCategory
      : 'Todos';
  const filteredProducts =
    currentCategory === 'Todos'
      ? products
      : products.filter((product) => product.category === currentCategory);
  const editingProduct = products.find((product) => product.id === editingProductId) ?? null;

  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }

  const syncProductsWithServer = async () => {
    const serverProducts = await fetchProducts();
    const normalizedProducts = serverProducts.map(normalizeProduct);
    setProducts(normalizedProducts);
    return normalizedProducts;
  };

  const handleMissingProduct = async (productId) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId));

    if (selectedProductId === productId) {
      closeProductModal();
    }

    if (editingProductId === productId) {
      resetProductForm();
    }

    try {
      await syncProductsWithServer();
    } catch {
      setProducts((prevProducts) => prevProducts.filter((product) => product.id !== productId));
    }

    showToast('Esse produto ja nao existe mais no servidor. Atualizei o catalogo.');
  };

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const syncViewport = () => setIsMobileViewport(mediaQuery.matches);

    syncViewport();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncViewport);
      return () => mediaQuery.removeEventListener('change', syncViewport);
    }

    mediaQuery.addListener(syncViewport);
    return () => mediaQuery.removeListener(syncViewport);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const persistedAdminSession = window.sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
    setIsAdminAuthenticated(persistedAdminSession === 'true');
  }, []);

  useEffect(() => {
    if (!isManagerPanelOpen || !editingProductId) return;

    const focusEditingForm = window.setTimeout(() => {
      managerPanelScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      managerFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      productNameInputRef.current?.focus();
    }, 80);

    return () => window.clearTimeout(focusEditingForm);
  }, [editingProductId, isManagerPanelOpen]);

  useEffect(() => {
    if (!selectedProductId) {
      setModalDragOffset(0);
    }
  }, [selectedProductId]);

  useEffect(() => {
    if (!isMobileViewport) {
      setModalDragOffset(0);
    }
  }, [isMobileViewport]);

  useEffect(() => {
    let isMounted = true;

    const loadProducts = async () => {
      try {
        const serverProducts = await fetchProducts();
        if (!isMounted) return;

        setProducts(serverProducts.map(normalizeProduct));
      } catch (error) {
        if (!isMounted) return;

        setProducts(createDefaultProducts());
        showToast(error.message || 'Nao foi possivel carregar o catalogo do servidor.');
      } finally {
        if (isMounted) {
          setIsProductsLoading(false);
        }
      }
    };

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  const resetProductForm = () => {
    setProductForm(EMPTY_PRODUCT_FORM);
    setEditingProductId(null);
  };

  const updateProductCardImageIndex = (productId, imagesLength, nextIndex) => {
    if (imagesLength <= 0) return;

    setProductCardImageIndexes((prevIndexes) => ({
      ...prevIndexes,
      [productId]: Math.min(Math.max(nextIndex, 0), imagesLength - 1),
    }));
  };

  const cycleProductCardImage = (productId, imagesLength, step) => {
    if (imagesLength <= 1) return;

    setProductCardImageIndexes((prevIndexes) => {
      const currentIndex = prevIndexes[productId] ?? 0;
      return {
        ...prevIndexes,
        [productId]: getWrappedImageIndex(currentIndex, imagesLength, step),
      };
    });
  };

  const handleProductCardTouchStart = (productId, event) => {
    if ((event.touches?.length ?? 0) !== 1) return;

    productCardTouchStateRef.current[productId] = {
      startX: event.touches[0].clientX,
    };
  };

  const handleProductCardTouchEnd = (productId, imagesLength, event) => {
    const touchState = productCardTouchStateRef.current[productId];
    delete productCardTouchStateRef.current[productId];

    if (!touchState || imagesLength <= 1) return;

    const endX = event.changedTouches?.[0]?.clientX;
    if (typeof endX !== 'number') return;

    const deltaX = endX - touchState.startX;
    if (Math.abs(deltaX) < PRODUCT_SWIPE_THRESHOLD) return;

    suppressedProductClickRef.current = {
      productId,
      timestamp: Date.now(),
    };
    cycleProductCardImage(productId, imagesLength, deltaX < 0 ? 1 : -1);
  };

  const shouldIgnoreProductCardClick = (productId) => {
    const { productId: suppressedProductId, timestamp } = suppressedProductClickRef.current;

    if (suppressedProductId !== productId) return false;

    if (Date.now() - timestamp > 450) return false;

    suppressedProductClickRef.current = { productId: null, timestamp: 0 };
    return true;
  };

  const handleProductImageUpload = async (event) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    const availableSlots = Math.max(0, MAX_IMAGES_PER_PRODUCT - productForm.gallery.length);
    const selectedFiles = files.slice(0, availableSlots);

    if (selectedFiles.length === 0) {
      showToast(`Cada produto pode ter no maximo ${MAX_IMAGES_PER_PRODUCT} imagens.`);
      event.target.value = '';
      return;
    }

    try {
      const galleryItems = await Promise.all(
        selectedFiles.map(async (file, index) => ({
          id: `pending-${Date.now()}-${index}-${file.name}`,
          previewUrl: await readFileAsDataUrl(file),
          persistedUrl: null,
          file,
          isExisting: false,
        })),
      );

      setProductForm((prevForm) => ({
        ...prevForm,
        gallery: [...prevForm.gallery, ...galleryItems],
      }));

      if (files.length > selectedFiles.length) {
        showToast(`Limite de ${MAX_IMAGES_PER_PRODUCT} imagens por produto.`);
      }
    } catch (error) {
      showToast(error.message || 'Nao foi possivel carregar as imagens selecionadas.');
    } finally {
      event.target.value = '';
    }
  };

  const removeGalleryItem = (itemId) => {
    setProductForm((prevForm) => ({
      ...prevForm,
      gallery: prevForm.gallery.filter((item) => item.id !== itemId),
    }));
  };

  const makeGalleryItemPrimary = (itemId) => {
    setProductForm((prevForm) => {
      const selectedItem = prevForm.gallery.find((item) => item.id === itemId);
      if (!selectedItem) {
        return prevForm;
      }

      return {
        ...prevForm,
        gallery: [selectedItem, ...prevForm.gallery.filter((item) => item.id !== itemId)],
      };
    });
  };

  const openManagerPanel = () => {
    setIsMenuOpen(false);

    if (!isAdminAuthenticated) {
      setIsAdminLoginOpen(true);
      return;
    }

    setIsManagerPanelOpen(true);
  };

  const closeManagerPanel = () => {
    setIsManagerPanelOpen(false);
  };

  const closeAdminLogin = () => {
    setIsAdminLoginOpen(false);
    setAdminLoginForm(EMPTY_ADMIN_LOGIN_FORM);
  };

  const handleAdminLoginFieldChange = (event) => {
    const { name, value } = event.target;
    setAdminLoginForm((prevForm) => ({ ...prevForm, [name]: value }));
  };

  const handleAdminLoginSubmit = (event) => {
    event.preventDefault();

    const username = adminLoginForm.username.trim();
    const password = adminLoginForm.password;

    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      showToast('Login de admin invalido.');
      return;
    }

    setIsAdminAuthenticated(true);
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(ADMIN_SESSION_STORAGE_KEY, 'true');
    }
    closeAdminLogin();
    setIsManagerPanelOpen(true);
    showToast('Login de admin realizado com sucesso.');
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    }
    setIsManagerPanelOpen(false);
    resetProductForm();
    showToast('Sessao de admin encerrada.');
  };

  const addToCart = (product, quantity = 1) => {
    setCart((prevCart) => {
      const existingProduct = prevCart.find((item) => item.id === product.id);

      if (existingProduct) {
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item,
        );
      }

      return [...prevCart, { ...product, quantity }];
    });

    showToast(`${quantity}x ${product.name} adicionado ao carrinho.`);
  };

  const updateCartQuantity = (id, delta) => {
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item,
      ),
    );
  };

  const removeFromCart = (id) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== id));
  };

  const handleCheckoutOnWhatsApp = () => {
    const checkoutUrl = buildWhatsAppCheckoutUrl(cart, cartTotal);

    if (!checkoutUrl) {
      showToast('Configure o numero em VITE_WHATSAPP_PHONE_NUMBER para finalizar no WhatsApp.');
      return;
    }

    if (typeof window !== 'undefined') {
      window.location.href = checkoutUrl;
    }
  };

  const openProductModal = (productId, startingImageIndex = 0) => {
    setSelectedProductId(productId);
    setSelectedQuantity(1);
    setActiveProductImageIndex(startingImageIndex);
    setModalDragOffset(0);
  };

  const closeProductModal = () => {
    setSelectedProductId(null);
    setSelectedQuantity(1);
    setActiveProductImageIndex(0);
    setModalDragOffset(0);
  };

  const handleProductCardKeyDown = (event, productId) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openProductModal(productId, productCardImageIndexes[productId] ?? 0);
    }
  };

  const handleProductModalDragStart = (event) => {
    if (!isMobileViewport || !selectedProductId || (event.touches?.length ?? 0) !== 1) return;

    modalDragStateRef.current = {
      startY: event.touches[0].clientY,
      isDragging: true,
    };
  };

  const handleProductModalDragMove = (event) => {
    if (!isMobileViewport || !modalDragStateRef.current.isDragging) return;

    const currentY = event.touches?.[0]?.clientY;
    if (typeof currentY !== 'number') return;

    const nextOffset = Math.max(0, currentY - modalDragStateRef.current.startY);
    setModalDragOffset(nextOffset);
  };

  const handleProductModalDragEnd = () => {
    if (!isMobileViewport || !modalDragStateRef.current.isDragging) return;

    modalDragStateRef.current.isDragging = false;

    if (modalDragOffset > MODAL_DRAG_CLOSE_THRESHOLD) {
      closeProductModal();
      return;
    }

    setModalDragOffset(0);
  };

  const addSelectedProductToCart = () => {
    if (!selectedProduct) return;
    addToCart(selectedProduct, selectedQuantity);
    closeProductModal();
  };

  const handleProductFieldChange = (event) => {
    const { name, value } = event.target;
    setProductForm((prevForm) => ({ ...prevForm, [name]: value }));
  };

  const startEditingProduct = (product) => {
    closeProductModal();
    setIsMenuOpen(false);
    setEditingProductId(product.id);
    setProductForm(formatProductToForm(product));
    setIsManagerPanelOpen(true);
    showToast(`${product.name} pronto para editar.`);
  };

  const handleProductSubmit = async (event) => {
    event.preventDefault();
    if (isSubmittingProductRef.current) return;

    if (!event.currentTarget.checkValidity()) {
      event.currentTarget.reportValidity();
      showToast('Preencha nome, preco, categoria e descricao para salvar.');
      return;
    }

    isSubmittingProductRef.current = true;
    setIsSubmittingProduct(true);

    try {
      const payload = buildProductPayload(productForm);
      const formData = new FormData();

      formData.set('name', payload.name);
      formData.set('price', String(payload.price));
      formData.set('category', payload.category);
      formData.set('badge', payload.badge);
      formData.set('description', payload.description);
      formData.set('details', JSON.stringify(payload.details));
      formData.set('existingImages', JSON.stringify(payload.existingImages));

      payload.newImages.forEach((item) => {
        formData.append('images', item.file);
      });

      const savedProduct = normalizeProduct(
        editingProductId
          ? await updateProduct(editingProductId, formData)
          : await createProduct(formData),
      );

      setProducts((prevProducts) => {
        if (editingProductId) {
          return prevProducts.map((product) => (product.id === editingProductId ? savedProduct : product));
        }

        return [savedProduct, ...prevProducts];
      });

      setCart((prevCart) =>
        prevCart.map((item) =>
          item.id === savedProduct.id ? { ...savedProduct, quantity: item.quantity } : item,
        ),
      );

      showToast(
        editingProductId
          ? `${savedProduct.name} atualizado com sucesso.`
          : `${savedProduct.name} adicionado ao catalogo.`,
      );

      resetProductForm();
    } catch (error) {
      if (editingProductId && isMissingProductError(error)) {
        await handleMissingProduct(editingProductId);
        return;
      }

      showToast(error.message || 'Nao foi possivel salvar o produto.');
    } finally {
      isSubmittingProductRef.current = false;
      setIsSubmittingProduct(false);
    }
  };

  const removeProduct = async (productId) => {
    const productToRemove = products.find((product) => product.id === productId);
    if (!productToRemove || removingProductIdRef.current === productId) return;

    try {
      removingProductIdRef.current = productId;
      setRemovingProductId(productId);

      await deleteProduct(productId);

      setProducts((prevProducts) => prevProducts.filter((product) => product.id !== productId));
      setCart((prevCart) => prevCart.filter((item) => item.id !== productId));

      if (selectedProductId === productId) closeProductModal();
      if (editingProductId === productId) resetProductForm();

      showToast(`${productToRemove.name} removido do catalogo.`);
    } catch (error) {
      if (isMissingProductError(error)) {
        await handleMissingProduct(productId);
        return;
      }

      showToast(error.message || 'Nao foi possivel remover o produto.');
    } finally {
      removingProductIdRef.current = null;
      setRemovingProductId(null);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-zinc-950 text-zinc-50 selection:bg-sky-300 selection:text-zinc-950">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8rem] top-[-6rem] h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute right-[-8rem] top-36 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      {toast && (
        <div className="animate-fade-in-up fixed bottom-4 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-full border border-sky-400/40 bg-zinc-950/95 px-6 py-3 font-semibold tracking-tight text-zinc-100 shadow-lg shadow-sky-500/10">
          <Star className="h-4 w-4 fill-current text-sky-300" />
          {toast}
        </div>
      )}

      <div className="flex items-center overflow-hidden whitespace-nowrap bg-gradient-to-r from-violet-300 via-indigo-300 to-sky-300 py-2 text-zinc-950">
        <div className="animate-marquee flex gap-8 text-sm font-black uppercase tracking-widest">
          {[...Array(10)].map((_, index) => (
            <span key={index} className="flex items-center gap-8">
              B'RITT WORLD TOUR 2026 <Star className="h-3 w-3 fill-current" /> NOVO MERCH DISPONIVEL{' '}
              <Star className="h-3 w-3 fill-current" />
            </span>
          ))}
        </div>
      </div>

      <nav className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="rounded-full p-2 text-zinc-400 transition hover:text-sky-300 lg:hidden"
              onClick={() => setIsMenuOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
            <a href="#" className="transition hover:opacity-90">
              <img
                src={logoSrc}
                alt="b'ritt logo"
                className="h-12 w-auto object-contain md:h-14"
                onError={() => setLogoHasError(true)}
              />
            </a>
          </div>

          <div className="hidden items-center gap-8 text-sm font-bold uppercase tracking-widest text-zinc-400 lg:flex">
            <a href="#catalogo" className="text-zinc-50 transition hover:text-sky-300">
              Loja
            </a>
            <button type="button" onClick={openManagerPanel} className="transition hover:text-sky-300">
              Gerenciar
            </button>
            <a href="#rodape" className="transition hover:text-sky-300">
              Contato
            </a>
          </div>

          <button
            type="button"
            className="group relative flex items-center gap-2 p-2 text-zinc-50 transition hover:text-sky-300"
            onClick={() => setIsCartOpen(true)}
          >
            <span className="hidden text-sm font-bold uppercase tracking-wider md:block">Carrinho</span>
            <div className="relative">
              <ShoppingBag className="h-6 w-6" />
              {cartItemsCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-violet-300 to-sky-300 text-xs font-black text-zinc-950">
                  {cartItemsCount}
                </span>
              )}
            </div>
          </button>
        </div>
      </nav>

      {isMenuOpen && (
        <div className="fixed inset-0 z-50 bg-zinc-950 p-6">
          <div className="mb-12 flex items-center justify-between">
            <img
              src={logoSrc}
              alt="b'ritt logo"
              className="h-12 w-auto object-contain"
              onError={() => setLogoHasError(true)}
            />
            <button
              type="button"
              onClick={() => setIsMenuOpen(false)}
              className="rounded-full bg-zinc-900 p-2 text-zinc-400 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="flex flex-col gap-6 text-2xl font-black uppercase tracking-widest">
            <a href="#catalogo" onClick={() => setIsMenuOpen(false)} className="text-sky-300">
              Loja
            </a>
            <button type="button" onClick={openManagerPanel} className="text-left">
              Gerenciar
            </button>
            <a href="#rodape" onClick={() => setIsMenuOpen(false)}>
              Contato
            </a>
          </div>
        </div>
      )}

      {isAdminLoginOpen && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center px-4 py-6 sm:px-6">
          <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-sm" onClick={closeAdminLogin}></div>
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-800 p-6">
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-sky-300">Area restrita</p>
                <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Login admin</h2>
              </div>
              <button
                type="button"
                onClick={closeAdminLogin}
                className="rounded-full bg-zinc-800 p-3 text-zinc-400 transition hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form className="grid gap-5 p-6" onSubmit={handleAdminLoginSubmit}>
              <p className="text-sm leading-6 text-zinc-400">
                Entre com o usuario e a senha de administrador para abrir o painel de gerenciamento.
              </p>

              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">Usuario</span>
                <input
                  required
                  name="username"
                  value={adminLoginForm.username}
                  onChange={handleAdminLoginFieldChange}
                  className={inputClassName}
                  placeholder="admin"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">Senha</span>
                <input
                  required
                  name="password"
                  type="password"
                  value={adminLoginForm.password}
                  onChange={handleAdminLoginFieldChange}
                  className={inputClassName}
                  placeholder="Digite sua senha"
                />
              </label>

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-300 via-indigo-300 to-sky-300 px-7 py-4 font-black uppercase tracking-[0.25em] text-zinc-950 transition-transform hover:scale-[1.01]"
              >
                <Lock className="h-5 w-5" />
                Entrar no painel
              </button>
            </form>
          </div>
        </div>
      )}

      <section className="relative flex h-[70vh] items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={HERO_IMAGE_URL} alt="Banda tocando ao vivo" className="h-full w-full object-cover opacity-25 grayscale" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-zinc-950/20"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(147,197,253,0.18),transparent_38%),radial-gradient(circle_at_right,rgba(167,139,250,0.16),transparent_32%)]"></div>
        </div>

        <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-4 text-center">
          <span className="mb-4 block font-bold uppercase tracking-[0.3em] text-sky-300">Nova colecao</span>
          <h1 className="mb-6 text-6xl font-black uppercase leading-none tracking-tighter md:text-8xl lg:text-9xl">
            Caos & <br />{' '}
            <span className="bg-gradient-to-r from-violet-200 via-sky-200 to-indigo-200 bg-clip-text text-transparent">
              Poesia
            </span>
          </h1>
          <p className="mb-10 max-w-lg text-lg font-medium text-zinc-300 md:text-xl">
            A colecao oficial da nova turne mundial. Vista o som, seja a revolucao. Edicoes limitadas.
          </p>
          <a
            href="#catalogo"
            className="inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-violet-300 via-indigo-300 to-sky-300 px-10 py-4 font-black uppercase tracking-widest text-zinc-950 transition-transform hover:scale-105"
          >
            Explorar colecao <ArrowRight className="h-5 w-5" />
          </a>
        </div>
      </section>

      <main id="catalogo" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col items-center justify-between gap-6 text-center md:flex-row md:items-end md:text-left">
          <div>
            <h2 className="mb-2 text-4xl font-black uppercase tracking-tighter md:text-5xl">Merch oficial</h2>
            <p className="text-zinc-400">Garanta o seu antes que acabe.</p>
          </div>

          <div className="hide-scrollbar flex w-full justify-start gap-2 overflow-x-auto pb-2 md:w-auto md:justify-end">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`whitespace-nowrap rounded-full px-6 py-2 text-sm font-bold uppercase tracking-wider transition-colors ${
                  currentCategory === category
                    ? 'bg-gradient-to-r from-violet-300 via-indigo-300 to-sky-300 text-zinc-950'
                    : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {isProductsLoading ? (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-10 text-center">
            <p className="text-lg font-semibold text-zinc-100">Carregando catalogo...</p>
            <p className="mt-3 text-zinc-400">Buscando produtos e galerias direto do servidor.</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-10 text-center">
            <p className="text-lg font-semibold text-zinc-100">Nenhum produto nessa categoria.</p>
            <p className="mt-3 text-zinc-400">Abra o painel no menu para adicionar um novo item.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => (
              (() => {
                const productImages = getProductImages(product);
                const cardImageIndex = Math.min(
                  productCardImageIndexes[product.id] ?? 0,
                  Math.max(productImages.length - 1, 0),
                );
                const activeCardImage = productImages[cardImageIndex] ?? DEFAULT_PRODUCT_IMAGE;

                return (
                  <div
                    key={product.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Abrir detalhes de ${product.name}`}
                    className="group relative cursor-pointer rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                    onClick={() => {
                      if (shouldIgnoreProductCardClick(product.id)) return;
                      openProductModal(product.id, cardImageIndex);
                    }}
                    onKeyDown={(event) => handleProductCardKeyDown(event, product.id)}
                  >
                <div
                  className="relative mb-4 aspect-[4/5] overflow-hidden rounded-lg bg-zinc-900"
                  onTouchStart={(event) => handleProductCardTouchStart(product.id, event)}
                  onTouchEnd={(event) => handleProductCardTouchEnd(product.id, productImages.length, event)}
                >
                  {product.badge && (
                    <div className="absolute left-4 top-4 z-10 rounded-full bg-gradient-to-r from-violet-300 to-sky-300 px-3 py-1 text-xs font-black uppercase tracking-widest text-zinc-950">
                      {product.badge}
                    </div>
                  )}
                  {productImages.length > 1 && (
                    <div className="absolute right-4 top-4 z-10 rounded-full bg-zinc-950/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-100">
                      {cardImageIndex + 1}/{productImages.length}
                    </div>
                  )}
                  <img
                    src={activeCardImage}
                    alt={product.name}
                    className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105 group-hover:opacity-80"
                  />
                  {productImages.length > 1 && (
                    <>
                      <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center gap-2">
                        {productImages.map((image, index) => (
                          <button
                            key={`${product.id}-dot-${image}-${index}`}
                            type="button"
                            aria-label={`Ver imagem ${index + 1} de ${product.name}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              updateProductCardImageIndex(product.id, productImages.length, index);
                            }}
                            className={`h-2.5 rounded-full transition-all ${
                              cardImageIndex === index ? 'w-7 bg-sky-300' : 'w-2.5 bg-white/45'
                            }`}
                          />
                        ))}
                      </div>

                      <button
                        type="button"
                        aria-label={`Imagem anterior de ${product.name}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          cycleProductCardImage(product.id, productImages.length, -1);
                        }}
                        className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-zinc-950/75 p-2 text-zinc-100 opacity-100 transition hover:bg-zinc-950 lg:opacity-0 lg:group-hover:opacity-100"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        aria-label={`Proxima imagem de ${product.name}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          cycleProductCardImage(product.id, productImages.length, 1);
                        }}
                        className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-zinc-950/75 p-2 text-zinc-100 opacity-100 transition hover:bg-zinc-950 lg:opacity-0 lg:group-hover:opacity-100"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  <div className="absolute inset-x-0 bottom-0 translate-y-4 p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openProductModal(product.id, cardImageIndex);
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-zinc-50 py-4 font-black uppercase tracking-widest text-zinc-950 transition-colors hover:bg-sky-300"
                    >
                      <ArrowRight className="h-5 w-5" /> Ver detalhes
                    </button>
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-sm font-bold uppercase tracking-widest text-zinc-500">{product.category}</p>
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-lg font-bold uppercase leading-tight transition-colors group-hover:text-sky-300 md:text-xl">
                      {product.name}
                    </h3>
                    <span className="whitespace-nowrap text-lg font-black">{formatPrice(product.price)}</span>
                  </div>
                </div>
                  </div>
                );
              })()
            ))}
          </div>
        )}
      </main>

      {isManagerPanelOpen && (
        <div className="fixed inset-0 z-[60] px-4 py-6 sm:px-6 lg:px-8">
          <div className="absolute inset-0 bg-zinc-950/85 backdrop-blur-sm" onClick={closeManagerPanel}></div>
          <div className="relative mx-auto flex max-h-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-800 p-6 sm:p-8">
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-sky-300">Painel do catalogo</p>
                <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Gerenciar produtos</h2>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleAdminLogout}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-700 bg-zinc-950 px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-zinc-100 transition hover:border-sky-400 hover:text-sky-300"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
                <button
                  type="button"
                  onClick={closeManagerPanel}
                  className="rounded-full bg-zinc-800 p-3 text-zinc-400 transition hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div ref={managerPanelScrollRef} className="grid flex-1 gap-8 overflow-y-auto p-6 sm:p-8 lg:grid-cols-[0.95fr_1.05fr]">
              <form ref={managerFormRef} className="grid gap-4" onSubmit={handleProductSubmit}>
                {editingProduct && (
                  <div className="rounded-3xl border border-sky-400/30 bg-sky-400/10 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-sky-300">Editando agora</p>
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-lg font-black uppercase text-white">{editingProduct.name}</p>
                        <p className="mt-1 text-sm text-zinc-400">O formulario foi preenchido com os dados atuais desse produto.</p>
                      </div>
                      <button
                        type="button"
                        onClick={resetProductForm}
                        className="rounded-full border border-zinc-700 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-100 transition hover:border-sky-400 hover:text-sky-300"
                      >
                        Cancelar edicao
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">Nome</span>
                    <input
                      ref={productNameInputRef}
                      required
                      name="name"
                      value={productForm.name}
                      onChange={handleProductFieldChange}
                      className={inputClassName}
                      placeholder="Ex: Jaqueta Nebula Tour"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">Preco</span>
                    <input
                      required
                      min="0"
                      step="0.01"
                      name="price"
                      type="number"
                      value={productForm.price}
                      onChange={handleProductFieldChange}
                      className={inputClassName}
                      placeholder="0.00"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">Categoria</span>
                    <input
                      required
                      name="category"
                      value={productForm.category}
                      onChange={handleProductFieldChange}
                      className={inputClassName}
                      placeholder="Roupas, Acessorios..."
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">Badge</span>
                    <input
                      name="badge"
                      value={productForm.badge}
                      onChange={handleProductFieldChange}
                      className={inputClassName}
                      placeholder="Novo, Limitado..."
                    />
                  </label>
                </div>

                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">Imagens do produto</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleProductImageUpload}
                    className="block w-full cursor-pointer rounded-2xl border border-dashed border-zinc-700 bg-zinc-950 px-4 py-5 text-sm text-zinc-300 file:mr-4 file:rounded-full file:border-0 file:bg-sky-300 file:px-4 file:py-2 file:font-bold file:text-zinc-950 hover:border-sky-400"
                  />
                  <p className="text-sm text-zinc-500">
                    Envie varias imagens de uma vez. A primeira vira a capa do produto.
                  </p>
                </label>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">Galeria</span>
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      {productForm.gallery.length}/{MAX_IMAGES_PER_PRODUCT}
                    </span>
                  </div>

                  {productForm.gallery.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/70 px-4 py-6 text-center text-sm text-zinc-500">
                      Nenhuma imagem adicionada ainda.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {productForm.gallery.map((item, index) => (
                        <div key={item.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-2">
                          <div className="relative aspect-square overflow-hidden rounded-xl bg-zinc-900">
                            <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
                            {index === 0 && (
                              <div className="absolute left-2 top-2 rounded-full bg-gradient-to-r from-violet-300 to-sky-300 px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-950">
                                Capa
                              </div>
                            )}
                          </div>
                          <div className="mt-2 flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => makeGalleryItemPrimary(item.id)}
                              className="rounded-full border border-zinc-700 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-100 transition hover:border-sky-400 hover:text-sky-300"
                            >
                              Tornar capa
                            </button>
                            <button
                              type="button"
                              onClick={() => removeGalleryItem(item.id)}
                              className="rounded-full border border-red-400/25 bg-red-500/10 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-red-200 transition hover:border-red-300/40 hover:text-red-100"
                            >
                              Remover
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">Descricao</span>
                  <textarea
                    required
                    rows="4"
                    name="description"
                    value={productForm.description}
                    onChange={handleProductFieldChange}
                    className={`${inputClassName} resize-none`}
                    placeholder="Descreva o produto."
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">Detalhes</span>
                  <textarea
                    rows="3"
                    name="details"
                    value={productForm.details}
                    onChange={handleProductFieldChange}
                    className={`${inputClassName} resize-none`}
                    placeholder="Separe por virgula: arte exclusiva, 100% algodao, edicao limitada"
                  />
                </label>

                <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                  <button
                    type="submit"
                    disabled={isSubmittingProduct}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-300 via-indigo-300 to-sky-300 px-7 py-4 font-black uppercase tracking-[0.25em] text-zinc-950 transition-transform hover:scale-[1.01]"
                  >
                    <Plus className="h-5 w-5" />
                    {isSubmittingProduct
                      ? 'Salvando...'
                      : editingProductId
                        ? 'Salvar edicao'
                        : 'Adicionar produto'}
                  </button>
                  <button
                    type="button"
                    onClick={resetProductForm}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-700 bg-zinc-950 px-7 py-4 font-semibold uppercase tracking-[0.25em] text-zinc-100 transition hover:border-sky-400 hover:text-sky-300"
                  >
                    <X className="h-5 w-5" />
                    Limpar
                  </button>
                </div>
              </form>

              <div className="space-y-4">
                {products.map((product) => (
                  <div key={product.id} className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
                    <div className="flex gap-4">
                      <img
                        src={getPrimaryImage(product)}
                        alt={product.name}
                        className="h-24 w-20 flex-shrink-0 rounded-2xl object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-lg font-black uppercase text-white">{product.name}</h3>
                          {product.badge && (
                            <span className="rounded-full bg-zinc-800 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-sky-300">
                              {product.badge}
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">
                          {product.category}
                        </p>
                        <p className="mt-3 text-sm leading-6 text-zinc-300">{product.description}</p>
                        <p className="mt-3 text-base font-black text-sky-300">{formatPrice(product.price)}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => startEditingProduct(product)}
                        className={`inline-flex items-center justify-center gap-2 rounded-full border px-5 py-3 text-xs font-semibold uppercase tracking-[0.25em] transition ${
                          editingProductId === product.id
                            ? 'border-sky-400 bg-sky-400/10 text-sky-300'
                            : 'border-zinc-700 bg-zinc-900 text-zinc-100 hover:border-sky-400 hover:text-sky-300'
                        }`}
                      >
                        <ArrowRight className="h-4 w-4" />
                        {editingProductId === product.id ? 'Editando' : 'Editar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeProduct(product.id)}
                        disabled={removingProductId === product.id}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-red-400/25 bg-red-500/10 px-5 py-3 text-xs font-semibold uppercase tracking-[0.25em] text-red-200 transition hover:border-red-300/40 hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2 className="h-4 w-4" />
                        {removingProductId === product.id ? 'Removendo...' : 'Remover'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedProduct && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center px-0 pt-4 sm:items-center sm:px-6 sm:py-6 lg:px-8">
          <div className="absolute inset-0 bg-zinc-950/85 backdrop-blur-sm" onClick={closeProductModal}></div>
          <div className="animate-modal-shell relative w-full sm:max-w-5xl">
            <div
              className={`relative flex w-full flex-col overflow-hidden border border-zinc-800 bg-zinc-900 shadow-2xl transition-transform duration-300 ${
                isMobileViewport
                  ? 'h-[88dvh] rounded-t-[2rem] border-b-0 border-l-0 border-r-0'
                  : 'max-h-[90vh] rounded-3xl lg:flex-row'
              }`}
              style={isMobileViewport ? { transform: `translateY(${modalDragOffset}px)` } : undefined}
            >
            <div
              className={`shrink-0 flex items-center justify-center bg-zinc-900/95 py-3 ${isMobileViewport ? 'border-b border-zinc-800' : 'sr-only'}`}
              onTouchStart={handleProductModalDragStart}
              onTouchMove={handleProductModalDragMove}
              onTouchEnd={handleProductModalDragEnd}
              onTouchCancel={handleProductModalDragEnd}
            >
              <div className="flex items-center gap-2 rounded-full bg-zinc-800 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.25em] text-zinc-300">
                <Grip className="h-4 w-4" />
                Arraste para fechar
              </div>
            </div>

            <div
              className={`relative min-h-0 shrink-0 overflow-hidden bg-zinc-950 ${
                isMobileViewport ? 'max-h-[38vh] w-full' : 'min-h-[300px] lg:w-1/2'
              }`}
            >
              {selectedProduct.badge && (
                <div className="absolute left-4 top-4 z-10 rounded-full bg-gradient-to-r from-violet-300 to-sky-300 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-zinc-950 sm:left-6 sm:top-6 sm:text-xs">
                  {selectedProduct.badge}
                </div>
              )}
              <img src={activeProductImage} alt={selectedProduct.name} className="h-full w-full object-cover" />
              {selectedProductImages.length > 1 && (
                <div className="absolute inset-x-0 bottom-0 flex gap-3 overflow-x-auto bg-gradient-to-t from-zinc-950/95 via-zinc-950/70 to-transparent p-3 sm:p-4">
                  {selectedProductImages.map((image, index) => (
                    <button
                      key={`${selectedProduct.id}-${image}-${index}`}
                      type="button"
                      onClick={() => setActiveProductImageIndex(index)}
                      className={`h-16 w-14 flex-shrink-0 overflow-hidden rounded-xl border transition sm:h-20 sm:w-16 ${
                        currentProductImageIndex === index
                          ? 'border-sky-300'
                          : 'border-zinc-700 hover:border-zinc-500'
                      }`}
                    >
                      <img src={image} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              <div className="shrink-0 flex items-start justify-between gap-4 border-b border-zinc-800 p-5 sm:p-8">
                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-sky-300">{selectedProduct.category}</p>
                  <h3 className="text-2xl font-black uppercase leading-none tracking-tighter text-white sm:text-4xl">
                    {selectedProduct.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={closeProductModal}
                  className="shrink-0 rounded-full bg-zinc-800 p-3 text-zinc-400 transition hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-8">
                <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-3xl font-black text-sky-300">{formatPrice(selectedProduct.price)}</span>
                  <span className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">Entrega em ate 7 dias uteis</span>
                </div>

                <p className="mb-8 text-base leading-7 text-zinc-300">{selectedProduct.description}</p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {selectedProduct.details.map((detail) => (
                    <div
                      key={detail}
                      className="rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-4 text-sm font-bold uppercase tracking-wider text-zinc-300"
                    >
                      {detail}
                    </div>
                  ))}
                </div>
              </div>

              <div className="shrink-0 border-t border-zinc-800 bg-zinc-900/95 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:p-8 sm:pb-8">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
                  <div>
                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">Quantidade</p>
                    <div className="flex w-fit items-center gap-4 rounded-full border border-zinc-800 bg-zinc-950 px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setSelectedQuantity((prevQuantity) => Math.max(1, prevQuantity - 1))}
                        className="p-1 text-zinc-400 transition hover:text-white"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center text-lg font-black text-white">{selectedQuantity}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedQuantity((prevQuantity) => prevQuantity + 1)}
                        className="p-1 text-zinc-400 transition hover:text-white"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={addSelectedProductToCart}
                    className="flex w-full items-center justify-center gap-3 rounded-full bg-gradient-to-r from-violet-300 via-indigo-300 to-sky-300 px-8 py-4 font-black uppercase tracking-widest text-zinc-950 transition-transform hover:scale-[1.01] sm:flex-1"
                  >
                    <ShoppingBag className="h-5 w-5" />
                    Adicionar ao carrinho
                  </button>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      )}

      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>
          <div className="animate-slide-in-right relative flex h-full w-full max-w-md flex-col border-l border-zinc-800 bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 p-6">
              <h2 className="flex items-center gap-3 text-2xl font-black uppercase tracking-tighter text-white">
                Carrinho
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-violet-300 to-sky-300 text-sm text-zinc-950">
                  {cartItemsCount}
                </span>
              </h2>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="rounded-full bg-zinc-800 p-2 text-zinc-400 transition hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {cart.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-4 text-zinc-500">
                  <ShoppingBag className="h-16 w-16 opacity-20" />
                  <p className="text-center font-bold uppercase tracking-widest">
                    Seu carrinho esta vazio.
                    <br />
                    Bora encher?
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsCartOpen(false)}
                    className="mt-4 rounded-full border border-zinc-700 px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors hover:border-sky-400 hover:text-sky-300"
                  >
                    Voltar a loja
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {cart.map((item) => (
                    <div key={item.id} className="flex gap-4 rounded-lg border border-zinc-800/60 bg-zinc-950/50 p-3">
                      <div className="h-24 w-20 flex-shrink-0 overflow-hidden rounded bg-zinc-800">
                        <img src={getPrimaryImage(item)} alt={item.name} className="h-full w-full object-cover" />
                      </div>
                      <div className="flex flex-1 flex-col justify-between py-1">
                        <div>
                          <h4 className="mb-1 text-sm font-bold uppercase leading-tight text-white">{item.name}</h4>
                          <span className="font-black text-sky-300">{formatPrice(item.price)}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center gap-3 rounded-full border border-zinc-800 bg-zinc-900 px-2 py-1">
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(item.id, -1)}
                              className="text-zinc-400 transition hover:text-white"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-4 text-center text-sm font-bold text-white">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(item.id, 1)}
                              className="text-zinc-400 transition hover:text-white"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.id)}
                            className="rounded-full p-1 text-red-400 transition hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t border-zinc-800 bg-zinc-950 p-6">
                <div className="mb-6 flex items-center justify-between">
                  <span className="font-bold uppercase tracking-widest text-zinc-400">Total</span>
                  <span className="text-3xl font-black text-sky-300">{formatPrice(cartTotal)}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCheckoutOnWhatsApp}
                  className="w-full rounded-full bg-gradient-to-r from-violet-300 via-indigo-300 to-sky-300 py-4 text-lg font-black uppercase tracking-widest text-zinc-950 transition-transform hover:scale-[1.02]"
                >
                  Finalizar no WhatsApp
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <footer id="rodape" className="border-t border-zinc-900 bg-zinc-950 px-4 pb-10 pt-20 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-12 md:flex-row">
          <div className="max-w-sm">
            <a href="#" className="mb-6 block transition hover:opacity-90">
              <img
                src={logoSrc}
                alt="b'ritt logo"
                className="h-16 w-auto object-contain"
                onError={() => setLogoHasError(true)}
              />
            </a>
            <p className="mb-6 font-medium text-zinc-500">
              Muito mais que uma banda. Uma comunidade, um estilo de vida. Gerencie o catalogo direto pelo menu.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="SEU E-MAIL"
                className="w-full rounded-full border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-bold uppercase tracking-wider text-white outline-none transition focus:border-sky-400"
              />
              <button
                type="button"
                className="rounded-full bg-zinc-50 px-6 text-sm font-black uppercase text-zinc-950 transition-colors hover:bg-sky-300"
              >
                Assinar
              </button>
            </div>
          </div>

          <div className="flex gap-16">
            <div className="flex flex-col gap-4">
              <h4 className="mb-2 font-black uppercase tracking-widest text-sky-300">Links</h4>
              <a href="#catalogo" className="text-sm font-bold uppercase tracking-wider text-zinc-400 hover:text-white">
                Loja
              </a>
              <a href="#" className="text-sm font-bold uppercase tracking-wider text-zinc-400 hover:text-white">
                Turne 2026
              </a>
              <a href="#rodape" className="text-sm font-bold uppercase tracking-wider text-zinc-400 hover:text-white">
                Contato
              </a>
            </div>
            <div className="flex flex-col gap-4">
              <h4 className="mb-2 font-black uppercase tracking-widest text-sky-300">Social</h4>
              <a href="#" className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-400 hover:text-white">
                <Camera className="h-4 w-4" /> Instagram
              </a>
              <a href="#" className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-400 hover:text-white">
                <Music2 className="h-4 w-4" /> Spotify
              </a>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-20 flex max-w-7xl flex-col items-center justify-between gap-4 border-t border-zinc-900 pt-8 text-sm font-bold uppercase tracking-wider text-zinc-600 md:flex-row">
          <p>2026 B'RITT OFICIAL. TODOS OS DIREITOS RESERVADOS.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-zinc-400">
              Privacidade
            </a>
            <a href="#" className="hover:text-zinc-400">
              Termos
            </a>
          </div>
        </div>
      </footer>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
          width: max-content;
        }
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes modal-shell-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-modal-shell {
          animation: modal-shell-in 0.2s ease-out forwards;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `,
        }}
      />
    </div>
  );
}
