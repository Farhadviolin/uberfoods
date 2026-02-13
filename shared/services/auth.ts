/**
 * Shared Authentication Service für alle Frontend-Anwendungen
 * Einheitliche Authentifizierung und Session-Management
 */

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'SUPPORT' | 'CUSTOMER' | 'DRIVER' | 'RESTAURANT';
  avatar?: string;
  permissions?: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: User['role'];
}

class AuthService {
  private user: User | null = null;
  private tokens: AuthTokens | null = null;
  private refreshPromise: Promise<AuthTokens> | null = null;
  private listeners: Set<(user: User | null) => void> = new Set();

  constructor() {
    this.loadFromStorage();
    this.setupTokenRefresh();
  }

  // User-Listener für Reaktivität
  subscribe(listener: (user: User | null) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.user));
  }

  // Daten aus LocalStorage laden
  private loadFromStorage() {
    try {
      const userData = localStorage.getItem('user');
      const tokensData = localStorage.getItem('tokens');

      if (userData) {
        this.user = JSON.parse(userData);
      }

      if (tokensData) {
        this.tokens = JSON.parse(tokensData);
        // Prüfe Token-Expiration
        if (this.isTokenExpired()) {
          this.clearStorage();
        }
      }
    } catch (error) {
      console.error('Error loading auth data from storage:', error);
      this.clearStorage();
    }
  }

  // Daten in LocalStorage speichern
  private saveToStorage() {
    if (this.user) {
      localStorage.setItem('user', JSON.stringify(this.user));
    } else {
      localStorage.removeItem('user');
    }

    if (this.tokens) {
      localStorage.setItem('tokens', JSON.stringify(this.tokens));
    } else {
      localStorage.removeItem('tokens');
    }
  }

  // Storage leeren
  private clearStorage() {
    localStorage.removeItem('user');
    localStorage.removeItem('tokens');
    this.user = null;
    this.tokens = null;
  }

  // Token-Expiration prüfen
  private isTokenExpired(): boolean {
    if (!this.tokens) return true;
    return Date.now() >= this.tokens.expiresAt;
  }

  // Automatische Token-Refresh einrichten
  private setupTokenRefresh() {
    // Refresh Token kurz vor Ablauf
    const refreshThreshold = 5 * 60 * 1000; // 5 Minuten vor Ablauf

    const checkAndRefresh = () => {
      if (this.tokens && (this.tokens.expiresAt - Date.now()) < refreshThreshold) {
        this.refreshToken().catch(console.error);
      }
    };

    // Sofort prüfen
    checkAndRefresh();

    // Alle 60 Sekunden prüfen
    setInterval(checkAndRefresh, 60 * 1000);
  }

  // Login
  async login(credentials: LoginCredentials): Promise<User> {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login fehlgeschlagen');
      }

      const data = await response.json();
      const { user, access_token, refresh_token } = data;

      // Tokens setzen
      const expiresAt = Date.now() + (15 * 60 * 1000); // 15 Minuten
      this.tokens = {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt,
      };

      this.user = user;
      this.saveToStorage();
      this.notifyListeners();

      return user;
    } catch (error) {
      throw error;
    }
  }

  // Registrierung
  async register(data: RegisterData): Promise<User> {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registrierung fehlgeschlagen');
      }

      const userData = await response.json();
      return userData;
    } catch (error) {
      throw error;
    }
  }

  // Token refreshen
  async refreshToken(): Promise<AuthTokens> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    if (!this.tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    this.refreshPromise = fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.tokens.refreshToken }),
    })
      .then(async response => {
        if (!response.ok) {
          throw new Error('Token refresh failed');
        }

        const data = await response.json();
        const expiresAt = Date.now() + (15 * 60 * 1000); // 15 Minuten

        this.tokens = {
          accessToken: data.access_token,
          refreshToken: data.refresh_token || this.tokens.refreshToken,
          expiresAt,
        };

        this.saveToStorage();
        return this.tokens;
      })
      .finally(() => {
        this.refreshPromise = null;
      });

    return this.refreshPromise;
  }

  // Logout
  async logout(): Promise<void> {
    try {
      if (this.tokens?.accessToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.tokens.accessToken}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      this.clearStorage();
      this.notifyListeners();
    }
  }

  // Aktueller User
  getCurrentUser(): User | null {
    return this.user;
  }

  // Ist authentifiziert
  isAuthenticated(): boolean {
    return !!this.user && !!this.tokens && !this.isTokenExpired();
  }

  // Hat Rolle
  hasRole(role: User['role']): boolean {
    return this.user?.role === role;
  }

  // Hat eine der Rollen
  hasAnyRole(roles: User['role'][]): boolean {
    return !!this.user && roles.includes(this.user.role);
  }

  // Hat Berechtigung
  hasPermission(permission: string): boolean {
    if (!this.user) return false;

    // Super Admin hat alle Berechtigungen
    if (this.user.role === 'SUPER_ADMIN') return true;

    // Prüfe direkte Berechtigungen
    return this.user.permissions?.includes(permission) ||
           this.user.permissions?.includes(`${permission.split(':')[0]}:*`) ||
           this.user.permissions?.includes('*:*') ||
           false;
  }

  // Access Token für API-Calls
  getAccessToken(): string | null {
    if (this.isTokenExpired()) {
      return null;
    }
    return this.tokens?.accessToken || null;
  }

  // User-Daten aktualisieren
  updateUser(userData: Partial<User>) {
    if (this.user) {
      this.user = { ...this.user, ...userData };
      this.saveToStorage();
      this.notifyListeners();
    }
  }
}

// Singleton Instance
export const authService = new AuthService();

export default authService;