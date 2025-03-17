// Configuración de la aplicación Spotify
const clientId = '97d973ea484b40d592cbf2e18ca5fd5c'; // Reemplaza con tu Client ID de Spotify
const redirectUri = window.location.origin + window.location.pathname;
const scope = 'user-read-private user-read-email user-top-read user-library-read';

// Elementos del DOM
const loginButton = document.getElementById('login-button');
const logoutButton = document.getElementById('logout-button');
const loginContainer = document.getElementById('login-container');
const contentContainer = document.getElementById('content-container');
const userImage = document.getElementById('user-image');
const userName = document.getElementById('user-name');
const userEmail = document.getElementById('user-email');
const coversCollage = document.getElementById('covers-collage');

// Estado actual
let accessToken = null;
let coverImages = [];

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // Verificar si hay un token en la URL (callback de Spotify)
    const urlParams = new URLSearchParams(window.location.hash.substring(1));
    accessToken = urlParams.get('access_token');

    if (accessToken) {
        // Limpiar la URL
        history.pushState("", document.title, window.location.pathname);
        
        // Mostrar contenido y ocultar login
        loginContainer.classList.add('hidden');
        contentContainer.classList.remove('hidden');
        
        // Cargar datos del usuario y sus favoritos
        loadUserProfile();
        loadAllCovers();
    }

    // Eventos
    loginButton.addEventListener('click', authenticateWithSpotify);
    logoutButton.addEventListener('click', logout);
});

// Autenticación con Spotify
function authenticateWithSpotify() {
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;
    window.location.href = authUrl;
}

// Cerrar sesión
function logout() {
    accessToken = null;
    loginContainer.classList.remove('hidden');
    contentContainer.classList.add('hidden');
    coverImages = [];
    coversCollage.innerHTML = '';
}

// Cargar perfil del usuario
async function loadUserProfile() {
    try {
        const response = await fetch('https://api.spotify.com/v1/me', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Error al cargar perfil');
        }
        
        const data = await response.json();
        
        // Actualizar UI con datos del usuario
        userName.textContent = data.display_name;
        userEmail.textContent = data.email;
        
        // Imagen de perfil (si existe)
        if (data.images && data.images.length > 0) {
            userImage.src = data.images[0].url;
        } else {
            userImage.src = 'https://via.placeholder.com/80?text=User';
        }
    } catch (error) {
        console.error('Error cargando perfil:', error);
        showError('No se pudo cargar el perfil de usuario');
    }
}

// Mostrar animación de carga
function showLoading() {
    const loadingContainer = document.createElement('div');
    loadingContainer.className = 'loading-container';
    loadingContainer.id = 'loading';
    
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    
    loadingContainer.appendChild(spinner);
    coversCollage.appendChild(loadingContainer);
}

// Ocultar animación de carga
function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.remove();
    }
}

// Mostrar error
function showError(message) {
    hideLoading();
    const errorElement = document.createElement('div');
    errorElement.style.position = 'absolute';
    errorElement.style.top = '50%';
    errorElement.style.left = '50%';
    errorElement.style.transform = 'translate(-50%, -50%)';
    errorElement.style.color = 'white';
    errorElement.style.backgroundColor = 'rgba(220, 53, 69, 0.8)';
    errorElement.style.padding = '20px';
    errorElement.style.borderRadius = '5px';
    errorElement.style.textAlign = 'center';
    errorElement.innerHTML = `<p>${message}</p>`;
    coversCollage.appendChild(errorElement);
}

// Cargar todas las portadas (canciones, álbumes y artistas)
async function loadAllCovers() {
    showLoading();
    coverImages = [];
    
    try {
        // Obtener canciones más escuchadas
        const tracksPromise = fetch('https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=long_term', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        }).then(res => res.json());
        
        // Obtener artistas más escuchados
        const artistsPromise = fetch('https://api.spotify.com/v1/me/top/artists?limit=30&time_range=long_term', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        }).then(res => res.json());
        
        // Obtener álbumes guardados
        const albumsPromise = fetch('https://api.spotify.com/v1/me/albums?limit=20', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        }).then(res => res.json());
        
        // Esperar a que se completen todas las peticiones
        const [tracksData, artistsData, albumsData] = await Promise.all([tracksPromise, artistsPromise, albumsPromise]);
        
        // Procesar canciones
        if (tracksData.items && tracksData.items.length > 0) {
            tracksData.items.forEach(item => {
                if (item.album && item.album.images && item.album.images.length > 0) {
                    coverImages.push({
                        url: item.album.images[0].url,
                        name: item.name,
                        artist: item.artists[0].name,
                        type: 'track'
                    });
                }
            });
        }
        
        // Procesar artistas
        if (artistsData.items && artistsData.items.length > 0) {
            artistsData.items.forEach(item => {
                if (item.images && item.images.length > 0) {
                    coverImages.push({
                        url: item.images[0].url,
                        name: item.name,
                        artist: 'Artista',
                        type: 'artist'
                    });
                }
            });
        }
        
        // Procesar álbumes
        if (albumsData.items && albumsData.items.length > 0) {
            albumsData.items.forEach(item => {
                if (item.album && item.album.images && item.album.images.length > 0) {
                    coverImages.push({
                        url: item.album.images[0].url,
                        name: item.album.name,
                        artist: item.album.artists[0].name,
                        type: 'album'
                    });
                }
            });
        }
        
        // Si no hay imágenes, mostrar un mensaje de error
        if (coverImages.length === 0) {
            showError('No se encontraron portadas. Intenta reproducir más música en Spotify.');
            return;
        }
        
        // Eliminar duplicados basados en la URL
        coverImages = coverImages.filter((item, index, self) => 
            index === self.findIndex((t) => t.url === item.url)
        );
        
        // Crear el collage de portadas
        createCollage();
        
    } catch (error) {
        console.error('Error cargando portadas:', error);
        showError('Error al cargar tus portadas de Spotify. Por favor, intenta de nuevo.');
    } finally {
        hideLoading();
    }
}

// Crear el collage de portadas
function createCollage() {
    // Limpiar el contenedor
    coversCollage.innerHTML = '';
    
    // Calcular el número total de imágenes a mostrar
    const totalImages = Math.min(coverImages.length, 40); // Limitamos a 40 imágenes máximo
    
    for (let i = 0; i < totalImages; i++) {
        const cover = coverImages[i];
        
        // Crear elemento de portada
        const coverElement = document.createElement('div');
        coverElement.className = 'cover-item';
        
        // Calcular posición y tamaño aleatorios
        const size = Math.floor(Math.random() * 20) + 10; // Entre 10% y 30% del contenedor
        const posX = Math.floor(Math.random() * (100 - size)); // Posición X
        const posY = Math.floor(Math.random() * (100 - size)); // Posición Y
        const rotation = Math.floor(Math.random() * 60) - 30; // Rotación entre -30 y 30 grados
        const zIndex = Math.floor(Math.random() * 10) + 1; // Orden de apilamiento
        
        // Aplicar estilos de posición y tamaño
        coverElement.style.width = `${size}%`;
        coverElement.style.left = `${posX}%`;
        coverElement.style.top = `${posY}%`;
        coverElement.style.transform = `rotate(${rotation}deg)`;
        coverElement.style.zIndex = zIndex;
        
        // Crear imagen
        const img = document.createElement('img');
        img.src = cover.url;
        img.alt = `${cover.name} - ${cover.artist}`;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        
        // Añadir título que aparece al hacer hover
        coverElement.title = `${cover.name} - ${cover.artist}`;
        
        // Añadir imagen al elemento de portada
        coverElement.appendChild(img);
        
        // Añadir elemento al collage
        coversCollage.appendChild(coverElement);
        
        // Añadir evento de clic para abrir en Spotify
        coverElement.addEventListener('click', () => {
            // Aquí podrías abrir la canción/álbum/artista en Spotify
            // Por ejemplo, usando window.open() si tienes la URL de Spotify
        });
    }
}