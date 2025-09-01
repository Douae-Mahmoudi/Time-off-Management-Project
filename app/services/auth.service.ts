import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'//le service est disponible globalement dans l’application.
})

export class AuthService {

  private loginUrl = 'http://localhost/api/login.php';
  private registerUrl = 'http://localhost/api/register.php';

  constructor(private http: HttpClient) { }

  login(username: string, password: string): Observable<any> {
    //Crée un objet payload contenant les identifiants pour envoyer au backend.
    const payload = { User: username, password: password };
    console.log('Payload envoyé au backend :', payload);
//.pipe()  permet de chaîner des opérateurs RxJS pour traiter la réponse ou gérer les erreurs.
    return this.http.post<any>(this.loginUrl, payload).pipe(
      //tap()  opérateur RxJS pour réagir à la réponse sans la modifier.
      tap(response => {
        if (response.success) {
          //rôle principal de stocker les informations de l’utilisateur dans le navigateur après une connexion réussie
          localStorage.setItem('authToken', response.token); //stocke le token d’authentification dans le navigateur.
          localStorage.setItem('IdUser', response.IdUser);
          localStorage.setItem('Nom', response.Nom);
          localStorage.setItem('prenom', response.prenom);
          localStorage.setItem('User', response.User);
          localStorage.setItem('actif', String(response.actif));
          localStorage.setItem('userRole', response.role);

          console.log('Login successful. User data and token stored from PHP backend.');
        } else {
          console.error('Login failed (backend reported failure):', response.message);
          throw new Error(response.message || 'Identifiants incorrects.');
        }
      }),
      catchError((error: HttpErrorResponse) => {
        let errorMessage = 'Une erreur inconnue est survenue.';
        if (error.error instanceof ErrorEvent) {
          errorMessage = `Erreur réseau: ${error.error.message}`;
        } else {
          console.error(`Backend returned code ${error.status}, body was:`, error.error);
          if (error.status === 401) {
            errorMessage = (error.error && error.error.message) ? error.error.message : 'Nom d\'utilisateur ou mot de passe incorrect.';
          } else if (error.status === 404) {
            errorMessage = 'Endpoint de connexion introuvable. Vérifiez l\'URL du backend.';
          } else {
            errorMessage = 'Problème de communication avec le serveur. Veuillez réessayer plus tard.';
          }
        }
        console.error('Authentication service error (HTTP request):', errorMessage);
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  register(
    matricule: string,
    cin: string,
    nom: string,
    prenom: string,
    diplome: string, // Peut être vide
    password: string,
    role: string
  ): Observable<any> {
    const payload = {
      Matricule: matricule,
      CIN: cin,
      Nom: nom,
      Prenom: prenom,
      Diplome: diplome,
      password: password,
      Role: role
    };

    return this.http.post<any>(this.registerUrl, payload).pipe(
      tap(response => {
        if (response.success) {
          console.log('Registration successful:', response.message);
        } else {
          console.error('Registration failed (backend reported failure):', response.message);
          throw new Error(response.message || 'Échec de l\'inscription.');
        }
      }),
      catchError((error: HttpErrorResponse) => {
        let errorMessage = 'Une erreur inconnue est survenue lors de l\'inscription.';
        if (error.error instanceof ErrorEvent) {
          errorMessage = `Erreur réseau: ${error.error.message}`;
        } else {
          console.error(`Backend returned code ${error.status}, body was:`, error.error);
          if (error.status === 409) {
            errorMessage = (error.error && error.error.message) ? error.error.message : 'Matricule ou CIN déjà utilisé.';
          } else if (error.status === 400) {
            errorMessage = (error.error && error.error.message) ? error.error.message : 'Données d\'inscription invalides.';
          } else {
            errorMessage = 'Problème de communication avec le serveur lors de l\'inscription. Veuillez réessayer plus tard.';
          }
        }
        console.error('Registration service error (HTTP request):', errorMessage);
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('authToken');
  }

  logout(): void {
    localStorage.clear();
    console.log('User logged out. All local storage items cleared.');
  }

  getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  getUserNom(): string | null {
    return localStorage.getItem('Nom');
  }

  getUserPrenom(): string | null {
    return localStorage.getItem('prenom');
  }

  getUserUsername(): string | null {
    return localStorage.getItem('User');
  }

  getUserId(): string | null {
    return localStorage.getItem('IdUser');
  }

  isUserActive(): boolean {
    const actif = localStorage.getItem('actif');
    return actif === 'true';
  }

  getUserRole(): string | null {
    return localStorage.getItem('userRole');
  }
}
