import { Routes } from '@angular/router';
import { LoginComponent } from './login/login';
// import { DashboardComponent } from './dashboard/dashboard'; // <-- LIGNE COMMENTÉE OU SUPPRIMÉE
import { AuthGuard } from './guards/auth-guard'; // Importez votre AuthGuard

import { EmployeComponent } from './dashboards/employe/employe';
import { ChefServiceComponent } from './dashboards/chef-service/chef-service';
import { DirecteurComponent } from './dashboards/directeur/directeur';


export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: 'dashboard-employe',
    component: EmployeComponent, // Associe le chemin au composant spécifique de l'employé
    canActivate: [AuthGuard]
  },
  {
    path: 'dashboard-chef-service',
    component: ChefServiceComponent, // Associe le chemin au composant spécifique du chef de service
    canActivate: [AuthGuard]
  },
  {
    path: 'dashboard-directeur',
    component: DirecteurComponent, // Associe le chemin au composant spécifique du directeur
    canActivate: [AuthGuard]
  },

  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];
