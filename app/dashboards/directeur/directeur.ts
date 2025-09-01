import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { tap, catchError } from 'rxjs/operators';
import { throwError, Subscription } from 'rxjs';

//enregistres tous les types de graphiques/plugins de Chart.js pour pouvoir les utiliser (barres, lignes, camemberts, etc.).
Chart.register(...registerables);

// Interfaces pour les structures de données
interface DirecteurInfo {
  Matricule: string;
  CIN: string;
  Nom: string;
  Prenom: string;
  Adress: string | null;
  DateN: string | null;
  LieuN: string | null;
  SituationF: string | null;
  NbrEnfant: number | null;
  Diplome: string | null;
  DateEmb: string | null;
  Grade: string | null; // Ceci est le 'role' de l'utilisateur (Employé, Chef, Directeur)
  SoldeCongeAnnuel: number;
  SoldeCongeAnneePrecedente: number;
}

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
  Nom: string;
  Prenom: string;
  SoldeCongeAnnuel: number;
  SoldeCongeAnneePrecedente: number;
  Grade: string | null;
  commentaire_directeur?: string | null; // Pour le commentaire du directeur
}

interface EmployeBalanceInfo {
  Matricule: string;
  Nom: string;
  Prenom: string;
  SoldeCongeAnnuel: number;
  SoldeCongeAnneePrecedente: number;
  Grade: string | null;
}

interface FerieDay {
  IdF: number;
  IntituleF: string;
  DateDeb: string;
  nbrJ: number;
  annee: number;
  remarque: string | null;
}

interface CongeStatsByStatus {
  'En attente': number;
  'Approuvé': number;
  'Refusé': number;
}

interface PersonnelDetail {
  Matricule: string;
  CIN: string;
  Nom: string;
  Prenom: string;
  Adress: string | null;
  DateN: string | null;
  LieuN: string | null;
  SituationF: string | null;
  NbrEnfant: number | null;
  Diplome: string | null;
  DateEmb: string | null;
  Role: string | null; // Le rôle de l'utilisateur (Employé, Chef de service, Directeur)
  IntituleG: string | null; // L'intitulé du grade (Ingénieur de grade 3, etc.)
  SoldeCongeAnnuel: number;
  SoldeCongeAnneePrecedente: number;
  IdPersonne: number;
  Remarque: string | null;
}

@Component({
  selector: 'app-directeur',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './directeur.html',
  styleUrls: ['./directeur.css']
})

export class DirecteurComponent implements OnInit, OnDestroy {
  //@ViewChild('congeStatsChart') = récupère cette référence dans le code TS
  //ElementRef<HTMLCanvasElement> = dit à Angular que c’est un <canvas>
  //congeStatsChartRef = variable pour manipuler ce canvas dans ton composant
  @ViewChild('congeStatsChart') congeStatsChartRef!: ElementRef<HTMLCanvasElement>;
  chartInstance: Chart | undefined;

  activeSection: 'personalInfo' | 'manageChefRequests' | 'manageChefBalances' | 'statistics' | 'managePersonnelDetails' = 'personalInfo';

  directeurInfo: DirecteurInfo = {
    Matricule: '', CIN: '', Nom: '', Prenom: '', Adress: null, DateN: null,
    LieuN: null, SituationF: null, NbrEnfant: null, Diplome: null, DateEmb: null, Grade: null,
    SoldeCongeAnnuel: 22,
    SoldeCongeAnneePrecedente: 0
  };
  isLoadingDirecteurInfo: boolean = true;
  directeurInfoError: string | null = null;
  isEditingDirecteurInfo: boolean = false;
  updatedDirecteurInfo: DirecteurInfo;
  directeurInfoUpdateMessage: string | null = null;
  directeurInfoUpdateError: string | null = null;

  chefCongeRequests: CongeEntry[] = [];
  isLoadingChefRequests: boolean = true;
  chefRequestsError: string | null = null;

  chefBalances: EmployeBalanceInfo[] = [];
  isLoadingChefBalances: boolean = true;
  chefBalancesError: string | null = null;
  chefBalanceUpdateMessage: string | null = null;
  chefBalanceUpdateError: string | null = null;

  statisticsData: CongeStatsByStatus | null = null;
  isLoadingStatistics: boolean = true;
  statisticsError: string | null = null;

  feries: FerieDay[] = [];
  isLoadingFeries: boolean = true;
  feriesError: string | null = null;

  allPersonnel: PersonnelDetail[] = [];
  isLoadingAllPersonnel: boolean = true;
  allPersonnelError: string | null = null;
  selectedPersonnel: PersonnelDetail | null = null;
  isEditingPersonnelGrade: boolean = false;
  personnelGradeUpdateMessage: string | null = null;
  personnelGradeUpdateError: string | null = null;

  availableGradeIntitules: string[] = [];

  private apiUrl = 'http://localhost/api';

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private router: Router
  ) {
    this.updatedDirecteurInfo = { ...this.directeurInfo };
  }

  ngOnInit(): void {
    const matricule = this.authService.getUserUsername();
    if (matricule) {
      this.directeurInfo.Matricule = matricule;
      this.loadDirecteurInfo(matricule);
      this.loadFeries();
      this.loadAvailableGradeIntitules();
    } else {
      this.directeurInfoError = 'Matricule de l\'utilisateur non trouvé. Veuillez vous reconnecter.';
      this.isLoadingDirecteurInfo = false;
      this.isLoadingFeries = false;
      this.router.navigate(['/login']);
    }
  }

  ngOnDestroy(): void {
    if (this.chartInstance) {
      this.chartInstance.destroy();
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
//fct pour changer la section active
  setActiveSection(section: typeof this.activeSection): void {
    this.activeSection = section;
    switch (section) {
      case 'personalInfo':
        this.loadDirecteurInfo(this.directeurInfo.Matricule);
        break;
      case 'manageChefRequests':
        this.loadChefCongeRequests();
        break;
      case 'manageChefBalances':
        this.loadChefBalances();
        break;
      case 'statistics':
        this.loadStatistics();
        break;
      case 'managePersonnelDetails':
        this.loadAllPersonnel();
        this.selectedPersonnel = null;
        break;
    }
  }

  loadDirecteurInfo(matricule: string): void {
    this.isLoadingDirecteurInfo = true;
    this.directeurInfoError = null;

    this.http.get<any>(`${this.apiUrl}/get_personal_info.php?matricule=${matricule}`).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.directeurInfo = {
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
            SoldeCongeAnneePrecedente: response.data.SoldeCongeAnneePrecedente !== null ? parseInt(response.data.SoldeCongeAnneePrecedente) : 0
          };
          this.updatedDirecteurInfo = { ...this.directeurInfo };
        } else {
          this.directeurInfoError = response.message || 'Impossible de charger les informations personnelles du Directeur.';
        }
        this.isLoadingDirecteurInfo = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des infos personnelles du Directeur:', err);
        this.directeurInfoError = 'Erreur réseau ou serveur lors du chargement des informations personnelles du Directeur.';
        this.isLoadingDirecteurInfo = false;
      }
    });
  }

  toggleEditDirecteurInfo(): void {
    this.isEditingDirecteurInfo = !this.isEditingDirecteurInfo;
    this.directeurInfoUpdateMessage = null;
    this.directeurInfoUpdateError = null;
    if (this.isEditingDirecteurInfo) {
      this.updatedDirecteurInfo = { ...this.directeurInfo };
    }
  }

  saveDirecteurInfo(): void {
    this.directeurInfoUpdateMessage = null;
    this.directeurInfoUpdateError = null;

    if (!this.updatedDirecteurInfo.Matricule || !this.updatedDirecteurInfo.CIN || !this.updatedDirecteurInfo.Nom || !this.updatedDirecteurInfo.Prenom) {
      this.directeurInfoUpdateError = 'Les champs Matricule, CIN, Nom et Prénom sont obligatoires.';
      return;
    }

    this.http.post<any>(`${this.apiUrl}/update_personal_info.php`, this.updatedDirecteurInfo).subscribe({
      next: (response) => {
        if (response.success) {
          this.directeurInfoUpdateMessage = response.message || 'Informations personnelles du Directeur mises à jour avec succès !';
          this.isEditingDirecteurInfo = false;
          this.loadDirecteurInfo(this.directeurInfo.Matricule);
        } else {
          this.directeurInfoUpdateError = response.message || 'Échec de la mise à jour des informations personnelles du Directeur.';
        }
      },
      error: (err) => {
        console.error('Erreur lors de la mise à jour des infos personnelles du Directeur:', err);
        this.directeurInfoUpdateError = 'Erreur réseau ou serveur lors de la mise à jour des informations personnelles du Directeur.';
      }
    });
  }

  loadChefCongeRequests(): void {
    this.isLoadingChefRequests = true;
    this.chefRequestsError = null;

    this.http.get<any>(`${this.apiUrl}/get_all_conge_entries.php`).subscribe({
      next: (response) => {
        if (response.success && Array.isArray(response.data)) {
          this.chefCongeRequests = response.data
            .filter((req: CongeEntry) =>
              req.Statut === 'En attente' &&
              req.Grade && req.Grade.toLowerCase() === 'chef de service'
            )
            .map((item: any) => ({
              IdC: item.IdC,
              Matricule: item.Matricule,
              DateD: item.DateD,
              DateF: item.DateF,
              NbrJ: item.NbrJ,
              Annee: item.Annee,
              Remarque: item.Remarque,
              Statut: item.Statut,
              commentaire_chef: item.commentaire_chef || '',
              Nom: item.Nom,
              Prenom: item.Prenom,
              SoldeCongeAnnuel: item.SoldeCongeAnnuel,
              SoldeCongeAnneePrecedente: item.SoldeCongeAnneePrecedente,
              Grade: item.Grade
            }));
        } else {
          this.chefRequestsError = response.message || 'Impossible de charger les demandes de congé des Chefs de Service.';
          this.chefCongeRequests = [];
        }
        this.isLoadingChefRequests = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des demandes de congés des Chefs de Service:', err);
        this.chefRequestsError = 'Erreur réseau ou serveur lors du chargement des demandes de congés des Chefs de Service.';
        this.isLoadingChefRequests = false;
      }
    });
  }

  updateCongeStatus(conge: CongeEntry, newStatus: 'Approuvé' | 'Refusé'): void {
    const payload = {
      IdC: conge.IdC,
      Statut: newStatus,
      commentaire_chef: conge.commentaire_chef
    };

    console.log('Payload envoyé pour mise à jour du statut:', payload);

    this.http.post<any>(`${this.apiUrl}/update_conge_status.php`, payload).subscribe({
      next: (response) => {
        if (response.success) {
          alert(`Demande de congé ID ${conge.IdC} ${newStatus.toLowerCase()} avec succès. Remarque: "${conge.commentaire_chef || 'Aucune'}".`);
          this.loadChefCongeRequests();
          this.loadChefBalances();
        } else {
          alert(`Échec de la mise à jour du statut pour la demande ID ${conge.IdC}: ${response.message}`);
        }
      },
      error: (err) => {
        console.error('Erreur lors de la mise à jour du statut de congé:', err);
        alert(`Erreur réseau ou serveur lors de la mise à jour du statut de congé pour la demande ID ${conge.IdC}.`);
      }
    });
  }

  acceptCongeRequest(conge: CongeEntry): void {
    this.updateCongeStatus(conge, 'Approuvé');
  }

  refuseCongeRequest(conge: CongeEntry): void {
    this.updateCongeStatus(conge, 'Refusé');
  }

  loadChefBalances(): void {
    this.isLoadingChefBalances = true;
    this.chefBalancesError = null;
    this.chefBalanceUpdateMessage = null;
    this.chefBalanceUpdateError = null;

    this.http.get<any>(`${this.apiUrl}/get_all_persons_with_balances.php`).subscribe({
      next: (response) => {
        if (response.success && Array.isArray(response.data)) {
          this.chefBalances = response.data
            .filter((item: EmployeBalanceInfo) =>
              item.Grade && item.Grade.toLowerCase() === 'chef de service'
            )
            .map((item: any) => ({
              Matricule: item.Matricule,
              Nom: item.Nom,
              Prenom: item.Prenom,
              SoldeCongeAnnuel: item.SoldeCongeAnnuel !== null ? parseInt(item.SoldeCongeAnnuel) : 22,
              SoldeCongeAnneePrecedente: item.SoldeCongeAnneePrecedente !== null ? parseInt(item.SoldeCongeAnneePrecedente) : 0,
              Grade: item.Grade
            }));
        } else {
          this.chefBalancesError = response.message || 'Impossible de charger les soldes des Chefs de Service.';
          this.chefBalances = [];
        }
        this.isLoadingChefBalances = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des soldes des Chefs de Service:', err);
        this.chefBalancesError = 'Erreur réseau ou serveur lors du chargement des soldes des Chefs de Service.';
        this.isLoadingChefBalances = false;
      }
    });
  }

  updateChefCarryOverBalance(chef: EmployeBalanceInfo): void {
    this.chefBalanceUpdateMessage = null;
    this.chefBalanceUpdateError = null;

    if (chef.SoldeCongeAnneePrecedente < 0) {
      this.chefBalanceUpdateError = `Le solde reporté de ${chef.Nom} ${chef.Prenom} ne peut pas être négatif.`;
      return;
    }

    const payload = {
      matricule: chef.Matricule,
      solde: chef.SoldeCongeAnneePrecedente
    };

    this.http.post<any>(`${this.apiUrl}/update_carry_over_balance.php`, payload).subscribe({
      next: (response) => {
        if (response.success) {
          this.chefBalanceUpdateMessage = response.message || `Solde reporté de ${chef.Nom} ${chef.Prenom} mis à jour avec succès.`;
          this.loadChefBalances();
        } else {
          this.chefBalanceUpdateError = response.message || `Échec de la mise à jour du solde reporté de ${chef.Nom} ${chef.Prenom}.`;
        }
      },
      error: (err) => {
        console.error('Erreur lors de la mise à jour du solde reporté:', err);
        this.chefBalanceUpdateError = `Erreur réseau ou serveur lors de la mise à jour du solde reporté de ${chef.Nom} ${chef.Prenom}.`;
      }
    });
  }

  loadStatistics(): void {
    this.isLoadingStatistics = true;
    this.statisticsError = null;

    this.http.get<any>(`${this.apiUrl}/get_conge_stats_by_status.php`).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.statisticsData = response.data;
          //permet d’exécuter la fonction après que le DOM ait été mis à jour par Angular.
          setTimeout(() => {
            this.renderChart();
          }, 0);
        } else {
          this.statisticsError = response.message || 'Impossible de charger les statistiques de congés.';
          this.statisticsData = null;
        }
        this.isLoadingStatistics = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des statistiques de congés:', err);
        this.statisticsError = 'Erreur réseau ou serveur lors du chargement des statistiques de congés.';
        this.isLoadingStatistics = false;
      }
    });
  }

  renderChart(): void {
    if (!this.statisticsData || !this.congeStatsChartRef) {
      console.warn('Impossible de rendre le graphique: données ou référence canvas manquante.');
      return;
    }
    /*Si un graphique a déjà été créé (chartInstance existe), on
    le détruit pour éviter de superposer plusieurs graphiques sur le même canvas.*/
    if (this.chartInstance) {
      this.chartInstance.destroy();
    }
    const ctx = this.congeStatsChartRef.nativeElement.getContext('2d');
    if (ctx) {
      this.chartInstance = new Chart(ctx, {
        type: 'bar', // Type de graphique à barres
        data: {
          labels: ['En attente', 'Approuvé', 'Refusé'], // Étiquettes pour les barres
          datasets: [{
            label: 'Nombre de Demandes de Congé',
            data: [
              this.statisticsData['En attente'],
              this.statisticsData['Approuvé'],
              this.statisticsData['Refusé']
            ],
            backgroundColor: [
              'rgba(255, 159, 64, 0.8)', // Couleur pour 'En attente'
              'rgba(75, 192, 192, 0.8)', // Couleur pour 'Approuvé'
              'rgba(255, 99, 132, 0.8)'  // Couleur pour 'Refusé'
            ],
            borderColor: [
              'rgba(255, 159, 64, 1)',
              'rgba(75, 192, 192, 1)',
              'rgba(255, 99, 132, 1)'
            ],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Nombre de Demandes'
              }
            },
            x: {
              title: {
                display: true,
                text: 'Statut du Congé'
              }
            }
          },
          plugins: {
            legend: {
              display: false
            },
            title: {
              display: true,
              text: 'Statut des Demandes de Congé'
            }
          }
        }
      });
    }
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

  loadAvailableGradeIntitules(): void {
    this.http.get<any>(`${this.apiUrl}/get_all_grade_intitules.php`).subscribe({
      next: (response) => {
        if (response.success && Array.isArray(response.data)) {
          this.availableGradeIntitules = response.data.map((item: any) => item.IntituleG);
        } else {
          console.error('Impossible de charger les intitulés de grade disponibles:', response.message);
          this.availableGradeIntitules = [];
        }
      },
      error: (err) => {
        console.error('Erreur réseau ou serveur lors du chargement des intitulés de grade:', err);
        this.availableGradeIntitules = [];
      }
    });
  }

  loadAllPersonnel(): void {
    this.isLoadingAllPersonnel = true;
    this.allPersonnelError = null;
    this.selectedPersonnel = null;

    this.http.get<any>(`${this.apiUrl}/get_all_personnel_details.php`).subscribe({
      next: (response) => {
        if (response.success && Array.isArray(response.data)) {
          this.allPersonnel = response.data.map((item: any) => ({
            Matricule: item.Matricule,
            CIN: item.CIN,
            Nom: item.Nom,
            Prenom: item.Prenom,
            Adress: item.Adress || null,
            DateN: item.DateN || null,
            LieuN: item.LieuN || null,
            SituationF: item.SituationF || null,
            NbrEnfant: item.NbrEnfant !== null ? parseInt(item.NbrEnfant) : null,
            Diplome: item.Diplome || null,
            DateEmb: item.DateEmb || null,
            Role: item.Role || null,
            IntituleG: item.IntituleG || null,
            SoldeCongeAnnuel: item.SoldeCongeAnnuel !== null ? parseInt(item.SoldeCongeAnnuel) : 22,
            SoldeCongeAnneePrecedente: item.SoldeCongeAnneePrecedente !== null ? parseInt(item.SoldeCongeAnneePrecedente) : 0,
            IdPersonne: item.IdPersonne,
            Remarque: item.Remarque || null
          }));
        } else {
          this.allPersonnelError = response.message || 'Impossible de charger les fiches du personnel.';
          this.allPersonnel = [];
        }
        this.isLoadingAllPersonnel = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des fiches du personnel:', err);
        this.allPersonnelError = 'Erreur réseau ou serveur lors du chargement des fiches du personnel.';
        this.isLoadingAllPersonnel = false;
      }
    });
  }

  viewPersonnelDetails(personnel: PersonnelDetail): void {
    this.selectedPersonnel = { ...personnel };
    this.isEditingPersonnelGrade = false;
    this.personnelGradeUpdateMessage = null;
    this.personnelGradeUpdateError = null;
  }

  toggleEditPersonnelGrade(): void {
    this.isEditingPersonnelGrade = !this.isEditingPersonnelGrade;
    this.personnelGradeUpdateMessage = null;
    this.personnelGradeUpdateError = null;
  }

  savePersonnelGrade(): void {
    if (!this.selectedPersonnel) {
      this.personnelGradeUpdateError = 'Aucun personnel sélectionné.';
      return;
    }

    this.personnelGradeUpdateMessage = null;
    this.personnelGradeUpdateError = null;

    const payload = {
      matricule: this.selectedPersonnel.Matricule,
      newGradeIntitule: this.selectedPersonnel.IntituleG
    };

    this.http.post<any>(`${this.apiUrl}/update_personnel_intitule_grade.php`, payload).subscribe({
      next: (response) => {
        if (response.success) {
          this.personnelGradeUpdateMessage = response.message || `Grade de ${this.selectedPersonnel?.Nom} mis à jour avec succès.`;
          this.isEditingPersonnelGrade = false;
          this.loadAllPersonnel();
        } else {
          this.personnelGradeUpdateError = response.message || `Échec de la mise à jour du grade de ${this.selectedPersonnel?.Nom}.`;
        }
      },
      error: (err) => {
        console.error('Erreur lors de la mise à jour du grade du personnel:', err);
        this.personnelGradeUpdateError = 'Erreur réseau ou serveur lors de la mise à jour du grade.';
      }
    });
  }

  cancelEditPersonnelGrade(): void {
    this.isEditingPersonnelGrade = false;
    if (this.selectedPersonnel) {
      this.viewPersonnelDetails(this.selectedPersonnel);
    }
    this.personnelGradeUpdateMessage = null;
    this.personnelGradeUpdateError = null;
  }

  /**
   * Méthode pour générer le rapport PDF en appelant le script PHP.
   * Le script PHP va ensuite appeler l'API ASP.NET Core pour générer le PDF.
   */
  generatePdfReport(): void {
    // URL de votre nouveau script PHP qui va appeler l'API ASP.NET Core
    const phpPdfGeneratorUrl = 'http://localhost/api/generate_pdf_report.php';
    //Ce token servira à prouver au serveur que l’utilisateur est authentifié avant de générer le PDF.
    const token = this.authService.getToken(); // Récupérer le token  nécessaire pour PHP

    if (!token) {
      alert('Token d\'authentification manquant. Veuillez vous reconnecter.');
      return;
    }
    //Création des en-têtes HTTP
    //HttpHeaders est une classe Angular qui sert à créer des en-têtes HTTP pour une requête.
    //Bearer = type d’authentification
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}` // Envoyer le token à PHP si PHP en a besoin pour récupérer les données
    });
    // Angular s'attend à recevoir un fichier binaire (le PDF)
    //Blob = objet représentant des données binaires (PDF, image, etc.).
    this.http.post(phpPdfGeneratorUrl, {}, { headers, responseType: 'blob' }) // Le corps de la requête est vide car PHP récupère les données
      .pipe(
        tap(response => {
          // Vérifier le type de la réponse pour s'assurer que c'est un PDF
          if (response.type === 'application/pdf') {
            // Créer un URL pour le blob (le fichier PDF)
            const blob = new Blob([response], { type: 'application/pdf' });
            //On crée un URL temporaire pour pouvoir télécharger le fichier.
            const url = window.URL.createObjectURL(blob);

            // Créer un lien temporaire pour déclencher le téléchargement
            const a = document.createElement('a');
            a.href = url;
            a.download = 'RapportDeConges.pdf'; // Nom du fichier téléchargé
            document.body.appendChild(a);
            a.click(); // Simule un clic sur le lien pour lancer le téléchargement

            // Nettoyer : supprimer le lien temporaire et révoquer l'URL du blob
            window.URL.revokeObjectURL(url);
            a.remove();
            console.log('Rapport PDF généré et téléchargé avec succès.');
            alert('Le rapport PDF a été généré et téléchargé avec succès !');
          } else {
            // Si la réponse n'est pas un PDF (ex: erreur JSON de PHP)
            // Tente de lire la réponse comme du texte pour afficher le message d'erreur de PHP
            const reader = new FileReader();
            reader.onload = () => {
              try {
                const errorJson = JSON.parse(reader.result as string);
                console.error('Erreur PHP lors de la génération du PDF:', errorJson.message);
                alert('Erreur: ' + (errorJson.message || 'Problème lors de la génération du rapport.'));
              } catch (e) {
                console.error('Réponse inattendue de PHP (non-JSON):', reader.result);
                alert('Erreur inattendue du serveur lors de la génération du rapport.');
              }
            };
            reader.readAsText(response); // Lire le blob comme du texte pour analyser l'erreur
          }
        }),
        catchError((error: HttpErrorResponse) => { // Spécifier HttpErrorResponse pour un meilleur typage
          console.error('Erreur Angular lors de l\'appel au script PHP:', error);
          let errorMessage = 'Une erreur est survenue lors de la génération du rapport PDF.';
          if (error.error instanceof Blob && error.error.type === 'application/json') {
            // Si l'erreur est un Blob mais qu'il contient du JSON (ex: PHP a renvoyé une erreur JSON)
            const reader = new FileReader();
            reader.onload = () => {
              try {
                const jsonError = JSON.parse(reader.result as string);
                errorMessage = jsonError.message || errorMessage;
                console.error('Détails de l\'erreur du backend:', jsonError);
              } catch (e) {
                console.error('Erreur en parsant l\'erreur JSON du backend:', e);
              }
              alert(errorMessage + ' Veuillez vérifier la console pour plus de détails.');
            };
            reader.readAsText(error.error);
          } else if (error.error instanceof ErrorEvent) {
            // Erreur côté client (ex: problème réseau)
            errorMessage = `Erreur réseau: ${error.error.message}`;
            alert(errorMessage + ' Veuillez vérifier votre connexion internet.');
          } else {
            // Erreur du serveur (statut HTTP non 2xx)
            errorMessage = `Erreur serveur (${error.status}): ${error.statusText || 'Inconnue'}`;
            if (error.error && typeof error.error === 'string') {
              errorMessage += ` - ${error.error}`; // Si le corps de la réponse est une chaîne d'erreur
            }
            alert(errorMessage + ' Veuillez réessayer plus tard.');
          }
          return throwError(() => new Error(errorMessage));
        })
      )
      .subscribe();
  }
}
