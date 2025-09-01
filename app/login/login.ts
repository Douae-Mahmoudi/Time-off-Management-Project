import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})

export class LoginComponent {
  // Propriétés pour la connexion (Sign In)
  username: string = '';
  password: string = '';
  errorMessage: string = ''; // Pour les erreurs de connexion

  // Propriétés pour l'inscription (Sign Up)
  signupMatricule: string = '';
  signupCIN: string = '';
  signupNom: string = '';
  signupPrenom: string = '';
  signupDiplome: string = ''; // Optionnel
  signupPassword: string = '';
  signupConfirmPassword: string = '';
  signupRole: string = '';
  signupErrorMessage: string = ''; // Pour les erreurs d'inscription
  signupSuccessMessage: string = ''; // Pour les messages de succès d'inscription

  // Contrôle du panneau actif ('signIn' ou 'signUp')
  currentPanel: 'signIn' | 'signUp' = 'signIn';

  constructor(private authService: AuthService, private router: Router) { }

  // Méthode pour basculer entre les panneaux Sign In et Sign Up
  togglePanel(): void {
    event?.preventDefault();// empêche le comportement par défaut cad rechargement lorsque dans html on a balise a ...
    this.currentPanel = this.currentPanel === 'signIn' ? 'signUp' : 'signIn';
    this.errorMessage = '';
    this.signupErrorMessage = '';
    this.signupSuccessMessage = '';
    this.resetFormFields();
  }

  // Réinitialiser les champs des formulaires
  resetFormFields(): void {
    this.username = '';
    this.password = '';
    this.signupMatricule = '';
    this.signupCIN = '';
    this.signupNom = '';
    this.signupPrenom = '';
    this.signupDiplome = '';
    this.signupPassword = '';
    this.signupConfirmPassword = '';
    this.signupRole = '';
  }

  // Gère la soumission du formulaire de connexion (Sign In)
  onSignIn(): void {
    this.errorMessage = '';
    console.log('--- Tentative de connexion ---');
    console.log('Username (saisi):', this.username);
    console.log('Password (saisi):', this.password);

    if (!this.username || !this.password) {
      this.errorMessage = 'Veuillez saisir votre nom d\'utilisateur et votre mot de passe.';
      return;
    }
    // authService= l’instance qu’on utilise dans un composant pour appeler ses méthodes.

    this.authService.login(this.username, this.password).subscribe({
      // Cas où la requête réussit
      next: (response) => {
        console.log('Connexion réussie :', response);
        const userRole = this.authService.getUserRole();//getUserRole() méthode de AuthService
        console.log('Rôle de l\'utilisateur récupéré pour redirection :', userRole);

        let redirectToPath: string;

        switch (userRole) {
          case 'Employé':
            redirectToPath = '/dashboard-employe';
            break;
          case 'Chef de service':
            redirectToPath = '/dashboard-chef-service';
            break;
          case 'Directeur':
            redirectToPath = '/dashboard-directeur';
            break;
          default:
            redirectToPath = '/dashboard';
            break;
        }

        console.log(`Tentative de redirection vers : ${redirectToPath}`);
        this.router.navigate([redirectToPath]).then(success => {
          if (success) {
            console.log(`Redirection vers ${redirectToPath} réussie.`);
          } else {
            console.warn(`Redirection vers ${redirectToPath} échouée (peut-être déjà sur cette route ou problème de garde).`);
          }
        }).catch(err => {
          console.error(`Erreur lors de la redirection vers ${redirectToPath}:`, err);
        });

      },
      error: (error) => {
        console.error('Échec de la connexion :', error);
        this.errorMessage = error.message || 'Une erreur est survenue lors de la connexion. Veuillez réessayer.';
      }
    });
  }

  // Gère la soumission du formulaire d'inscription (Sign Up)
  onSignUp(): void {
    this.signupErrorMessage = '';
    this.signupSuccessMessage = '';

    console.log('--- Tentative d\'inscription ---');
    console.log('Matricule:', this.signupMatricule);
    console.log('CIN:', this.signupCIN);
    console.log('Nom:', this.signupNom);
    console.log('Prenom:', this.signupPrenom);
    console.log('Diplome:', this.signupDiplome);
    console.log('Role:', this.signupRole);
    console.log('Password (saisi):', this.signupPassword);

    if (!this.signupMatricule || !this.signupCIN || !this.signupNom || !this.signupPrenom || !this.signupPassword || !this.signupConfirmPassword || !this.signupRole) {
      this.signupErrorMessage = 'Veuillez remplir tous les champs obligatoires.';
      return;
    }

    if (this.signupPassword !== this.signupConfirmPassword) {
      this.signupErrorMessage = 'Les mots de passe ne correspondent pas.';
      return;
    }

    this.authService.register(
      this.signupMatricule,
      this.signupCIN,
      this.signupNom,
      this.signupPrenom,
      this.signupDiplome,
      this.signupPassword,
      this.signupRole
    ).subscribe({
      next: (response) => {
        console.log('Inscription réussie :', response);
        this.signupSuccessMessage = 'Votre compte a été créé avec succès ! Vous pouvez maintenant vous connecter.';
        this.resetFormFields();
        this.currentPanel = 'signIn';
      },
      error: (error) => {
        console.error('Échec de l\'inscription :', error);
        this.signupErrorMessage = error.message || 'Une erreur est survenue lors de l\'inscription. Veuillez réessayer.';
      }
    });
  }
}
