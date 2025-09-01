import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'//Cela rend le AuthGuard disponible partout dans l’application.
})
//CanActivate interface prédéfinie qui permet de protéger des routes.
export class AuthGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}
/*canActivate est appelée automatiquement par Angular
 lorsqu’un utilisateur essaie d’accéder à une route protégée.*/
  canActivate(
    route: ActivatedRouteSnapshot,//ActivatedRouteSnapshot → objet prédéfini contenant les infos de la route demandée (paramètres, queryParams, etc.).
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
//RouterStateSnapshot objet prédéfini représentant l’état complet de la navigation actuelle.
    if (this.authService.isLoggedIn()) {
      // L'utilisateur est connecté, autorise l'accès à la route
      return true;
    } else {
      // L'utilisateur n'est PAS connecté, redirige vers la page de connexion
      console.warn('Accès non autorisé. Redirection vers la page de connexion.');
      return this.router.createUrlTree(['/login']);
    }
  }
}
