import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

// Interfaces pour les structures de données
interface EmployeInfo {
  Matricule: string;
  CIN: string;
  Nom: string;
  Prenom: string;
  Adress: string | null;
  DateN: string | null; // Date de Naissance (format YYYY-MM-DD)
  LieuN: string | null; // Lieu de Naissance
  SituationF: string | null; // Situation Familiale
  NbrEnfant: number | null; // Nombre d'enfants
  Diplome: string | null;
  DateEmb: string | null; // Date d'Embauche (format YYYY-MM-DD)
  Grade: string | null; // Correspond à IntituleG de la BDD administrateur qui le donne cad employé n' a pas droit de l'écrire
  SoldeCongeAnnuel: number; // Solde annuel de la BDD
  SoldeCongeAnneePrecedente: number;
}

// Interface pour la demande de congé, adaptée à la table 'conge'
interface CongeRequest {
  dateD: string;
  dateF: string;
  nbrJ: number | null;
  annee: number | null;
  remarque: string;
  Matricule?: string;
}

// Interface pour le statut/historique des congés
interface CongeEntry {
  IdC: number;
  Matricule: string;
  DateD: string;
  DateF: string;
  NbrJ: number;
  Annee: number;
  Remarque: string;
  Statut: 'En attente' | 'Approuvé' | 'Refusé';
  commentaire_chef: string | null;
}

interface FerieDay {
  IdF: number;
  IntituleF: string;
  DateDeb: string; // YYYY-MM-DD
  nbrJ: number;
  annee: number;
  remarque: string | null;
}

interface Notification {
  id: number;
  message: string;
  date: string;
  read: boolean;
}

@Component({
  selector: 'app-employe',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employe.html',
  styleUrls: ['./employe.css']
})
export class EmployeComponent implements OnInit {
  // Propriété pour gérer la section active
  activeSection: 'personalInfo' | 'requestConge' | 'currentCongeStatus' | 'congeHistory' | 'congeBalance' | 'notifications' = 'personalInfo';

  // Informations personnelles de l'employé
  employeInfo: EmployeInfo = {
    Matricule: '', CIN: '', Nom: '', Prenom: '', Adress: null, DateN: null,
    LieuN: null, SituationF: null, NbrEnfant: null, Diplome: null, DateEmb: null, Grade: null,
    SoldeCongeAnnuel: 22, // Initialisation par défaut
    SoldeCongeAnneePrecedente: 0 // Initialisation par défaut
  };
  isLoadingPersonalInfo: boolean = true;
  personalInfoError: string | null = null;
  isEditingPersonalInfo: boolean = false;
  updatedEmployeInfo: EmployeInfo;
  personalInfoUpdateMessage: string | null = null;
  personalInfoUpdateError: string | null = null;

  // Modèle pour le formulaire de demande de congé
  newCongeRequest: CongeRequest = {
    dateD: '', dateF: '', nbrJ: null, annee: null, remarque: ''
  };
  congeRequestMessage: string | null = null;
  congeRequestError: string | null = null;

  // Liste des congés (filtrée par l'employé connecté)
  allCongeEntries: CongeEntry[] = [];
  isLoadingAllCongeEntries: boolean = true;
  allCongeEntriesError: string | null = null;

  // Jours fériés
  feries: FerieDay[] = [];
  isLoadingFeries: boolean = true;
  feriesError: string | null = null;

  // URL de  API PHP
  private apiUrl = 'http://localhost/api';

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private router: Router
  ) {
    this.updatedEmployeInfo = { ...this.employeInfo };
  }

  ngOnInit(): void {
    const matricule = this.authService.getUserUsername();
    if (matricule) {
      this.employeInfo.Matricule = matricule;
      this.loadPersonalInfo(matricule); // Chargera aussi les soldes
      this.loadAllCongeEntries(); // Chargement des congés de l'employé
      this.loadFeries();
    } else {
      this.personalInfoError = 'Matricule de l\'utilisateur non trouvé. Veuillez vous reconnecter.';
      this.allCongeEntriesError = 'Matricule de l\'utilisateur non trouvé.';
      this.feriesError = 'Matricule de l\'utilisateur non trouvé.';
      this.isLoadingPersonalInfo = false;
      this.isLoadingAllCongeEntries = false;
      this.isLoadingFeries = false;
      this.router.navigate(['/login']);
    }
  }

  setActiveSection(section: typeof this.activeSection): void {
    this.activeSection = section;
  }

  calculateNbrJ(): void {
    if (this.newCongeRequest.dateD && this.newCongeRequest.dateF) {
      const dateDebut = new Date(this.newCongeRequest.dateD);
      const dateFin = new Date(this.newCongeRequest.dateF);

      if (isNaN(dateDebut.getTime()) || isNaN(dateFin.getTime())) {
        this.newCongeRequest.nbrJ = null;
        return;
      }

      let countDays = 0;
      let currentDate = new Date(dateDebut);

      while (currentDate <= dateFin) {
        const dayOfWeek = currentDate.getDay(); // 0 = Dimanche, 6 = Samedi
        const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);

        const isFerie = this.feries.some(ferie => {
          const ferieDate = new Date(ferie.DateDeb);
          return currentDate.toDateString() === ferieDate.toDateString();
        });

        if (!isWeekend && !isFerie) {
          countDays++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      this.newCongeRequest.nbrJ = countDays;
    } else {
      this.newCongeRequest.nbrJ = null;
    }
  }

  calculateAnnee(): void {
    if (this.newCongeRequest.dateD) {
      this.newCongeRequest.annee = new Date(this.newCongeRequest.dateD).getFullYear();
    } else {
      this.newCongeRequest.annee = null;
    }
  }

  onDateChange(): void {
    this.calculateNbrJ();
    this.calculateAnnee();
  }

  loadPersonalInfo(matricule: string): void {
    this.isLoadingPersonalInfo = true;
    this.personalInfoError = null;

    this.http.get<any>(`${this.apiUrl}/get_personal_info.php?matricule=${matricule}`).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.employeInfo = {
            Matricule: response.data.Matricule || '',
            CIN: response.data.CIN || '',
            Nom: response.data.Nom || '',
            Prenom: response.data.Prenom || '',
            Adress: response.data.Adress || null,
            DateN: response.data.DateN || null,
            LieuN: response.data.LieuN || null,
            SituationF: response.data.SituationF || null,
            NbrEnfant: response.data.NbrEnfant !== null ? parseInt(response.data.NbrEnfant) : null,
            Diplome: response.data.Diplome || null,
            DateEmb: response.data.DateEmb || null,
            Grade: response.data.Grade || null,
            SoldeCongeAnnuel: response.data.SoldeCongeAnnuel !== null ? parseInt(response.data.SoldeCongeAnnuel) : 22,
            SoldeCongeAnneePrecedente: response.data.SoldeCongeAnneePrecedente !== null ? parseInt(response.data.SoldeCongeAnneePrecedente) : 0 // Récupère le solde reporté
          };
          this.updatedEmployeInfo = { ...this.employeInfo };
        } else {
          this.personalInfoError = response.message || 'Impossible de charger les informations personnelles.';
        }
        this.isLoadingPersonalInfo = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des infos personnelles:', err);
        this.personalInfoError = 'Erreur réseau ou serveur lors du chargement des informations personnelles.';
        this.isLoadingPersonalInfo = false;
      }
    });
  }

  toggleEditPersonalInfo(): void {
    this.isEditingPersonalInfo = !this.isEditingPersonalInfo;
    this.personalInfoUpdateMessage = null;
    this.personalInfoUpdateError = null;
    if (this.isEditingPersonalInfo) {
      this.updatedEmployeInfo = { ...this.employeInfo };
    }
  }

  savePersonalInfo(): void {
    this.personalInfoUpdateMessage = null;
    this.personalInfoUpdateError = null;

    if (!this.updatedEmployeInfo.Matricule || !this.updatedEmployeInfo.CIN || !this.updatedEmployeInfo.Nom || !this.updatedEmployeInfo.Prenom) {
      this.personalInfoUpdateError = 'Les champs Matricule, CIN, Nom et Prénom sont obligatoires.';
      return;
    }

    this.http.post<any>(`${this.apiUrl}/update_personal_info.php`, this.updatedEmployeInfo).subscribe({
      next: (response) => {
        if (response.success) {
          this.personalInfoUpdateMessage = response.message || 'Informations personnelles mises à jour avec succès !';
          this.isEditingPersonalInfo = false;
          this.loadPersonalInfo(this.employeInfo.Matricule);
        } else {
          this.personalInfoUpdateError = response.message || 'Échec de la mise à jour des informations personnelles.';
        }
      },
      error: (err) => {
        console.error('Erreur lors de la mise à jour des infos personnelles:', err);
        this.personalInfoUpdateError = 'Erreur réseau ou serveur lors de la mise à jour des informations personnelles.';
      }
    });
  }

  submitCongeRequest(): void {
    this.congeRequestMessage = null;
    this.congeRequestError = null;

    if (!this.newCongeRequest.dateD || !this.newCongeRequest.dateF || !this.newCongeRequest.remarque) {
      this.congeRequestError = 'Veuillez remplir tous les champs de la demande de congé.';
      return;
    }

    if (new Date(this.newCongeRequest.dateD) > new Date(this.newCongeRequest.dateF)) {
      this.congeRequestError = 'La date de début ne peut pas être après la date de fin.';
      return;
    }

    this.calculateNbrJ();
    // Calcul du solde total disponible pour la validation
    const totalAvailableDays = this.employeInfo.SoldeCongeAnnuel + this.employeInfo.SoldeCongeAnneePrecedente;

    if (this.newCongeRequest.nbrJ === null || this.newCongeRequest.nbrJ <= 0) {
      this.congeRequestError = 'Le nombre de jours de congé doit être supérieur à 0.';
      return;
    }
    if (this.newCongeRequest.nbrJ > totalAvailableDays) { // Utilise le solde total
      this.congeRequestError = `La durée de votre demande (${this.newCongeRequest.nbrJ} jours) dépasse votre solde de congés total disponible (${totalAvailableDays} jours).`;
      return;
    }


    const payload = {
      Matricule: this.employeInfo.Matricule, // le matricule de l'employé
      DateD: this.newCongeRequest.dateD,
      DateF: this.newCongeRequest.dateF,
      NbrJ: this.newCongeRequest.nbrJ,
      Annee: this.newCongeRequest.annee,
      Remarque: this.newCongeRequest.remarque
    };

    this.http.post<any>(`${this.apiUrl}/submit_conge_request.php`, payload).subscribe({
      next: (response) => {
        if (response.success) {
          this.congeRequestMessage = response.message || 'Demande de congé soumise avec succès !';
          this.newCongeRequest = { dateD: '', dateF: '', nbrJ: null, annee: null, remarque: '' };
          // Recharger les infos personnelles pour mettre à jour le solde si la demande est approuvée plus tard
          this.loadPersonalInfo(this.employeInfo.Matricule);
          this.loadAllCongeEntries(); // Recharger l'historique de l'employé
        } else {
          this.congeRequestError = response.message || 'Échec de la soumission de la demande de congé.';
        }
      },
      error: (err) => {
        console.error('Erreur lors de la soumission de la demande de congé:', err);
        this.congeRequestError = 'Erreur réseau ou serveur lors de la soumission de la demande de congé.';
      }
    });
  }

  loadAllCongeEntries(): void {
    this.isLoadingAllCongeEntries = true;
    this.allCongeEntriesError = null;

    this.http.get<any>(`${this.apiUrl}/get_all_conge_entries.php`).subscribe({
      next: (response) => {
        if (response.success && Array.isArray(response.data)) {
          // Filtrer les congés pour n'afficher que ceux de l'employé connecté
          this.allCongeEntries = response.data.filter((entry: CongeEntry) => entry.Matricule === this.employeInfo.Matricule).map((item: any) => ({
            IdC: item.IdC,
            Matricule: item.Matricule,
            DateD: item.DateD,
            DateF: item.DateF,
            NbrJ: item.NbrJ,
            Annee: item.Annee,
            Remarque: item.Remarque,
            Statut: item.Statut,
            commentaire_chef: item.commentaire_chef
          }));
        } else {
          this.allCongeEntriesError = response.message || 'Impossible de charger les entrées de congé.';
          this.allCongeEntries = [];
        }
        this.isLoadingAllCongeEntries = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des entrées de congés:', err);
        this.allCongeEntriesError = 'Erreur réseau ou serveur lors du chargement des entrées de congés.';
        this.isLoadingAllCongeEntries = false;
      }
    });
  }

  loadFeries(): void {
    this.isLoadingFeries = true;
    this.feriesError = null;

    this.http.get<any>(`${this.apiUrl}/get_feries.php`).subscribe({
      next: (response) => {
        if (response.success && Array.isArray(response.data)) {
          this.feries = response.data.map((item: any) => ({
            IdF: item.IdF,
            IntituleF: item.IntituleF,
            DateDeb: item.DateDeb,
            nbrJ: item.nbrJ,
            annee: item.annee,
            remarque: item.remarque || null
          }));
          console.log('Jours fériés chargés:', this.feries);
        } else {
          this.feriesError = response.message || 'Impossible de charger les jours fériés.';
          this.feries = [];
        }
        this.isLoadingFeries = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des jours fériés:', err);
        this.feriesError = 'Erreur réseau ou serveur lors du chargement des jours fériés.';
        this.isLoadingFeries = false;
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
