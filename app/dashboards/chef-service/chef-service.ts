import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

// Interfaces pour les structures de données
interface ChefInfo {
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
  Grade: string | null;
  SoldeCongeAnnuel: number;
  SoldeCongeAnneePrecedente: number;
}

interface CongeRequest {
  dateD: string;
  dateF: string;
  nbrJ: number | null;
  annee: number | null;
  remarque: string;
  Matricule?: string;
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
}

interface EmployeBalanceInfo {
  Matricule: string;
  Nom: string;
  Prenom: string;
  SoldeCongeAnnuel: number;
  SoldeCongeAnneePrecedente: number;
}

interface FerieDay {
  IdF: number;
  IntituleF: string;
  DateDeb: string;
  nbrJ: number;
  annee: number;
  remarque: string | null;
}

interface CongeBalance {
  annuel: number;
}

@Component({
  selector: 'app-chef-service',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chef-service.html',
  styleUrls: ['./chef-service.css']
})
export class ChefServiceComponent implements OnInit {
  activeSection: 'personalInfo' | 'requestConge' | 'manageEmployeeRequests' | 'congeHistory' | 'congeBalance' | 'notifications' | 'manageEmployeeBalances' = 'personalInfo';

  chefInfo: ChefInfo = {
    Matricule: '', CIN: '', Nom: '', Prenom: '', Adress: null, DateN: null,
    LieuN: null, SituationF: null, NbrEnfant: null, Diplome: null, DateEmb: null, Grade: null,
    SoldeCongeAnnuel: 22,
    SoldeCongeAnneePrecedente: 0
  };
  isLoadingChefInfo: boolean = true;
  chefInfoError: string | null = null;
  isEditingChefInfo: boolean = false;
  updatedChefInfo: ChefInfo;
  chefInfoUpdateMessage: string | null = null;
  chefInfoUpdateError: string | null = null;

  newChefCongeRequest: CongeRequest = {
    dateD: '', dateF: '', nbrJ: null, annee: null, remarque: ''
  };
  chefCongeRequestMessage: string | null = null;
  chefCongeRequestError: string | null = null;

  allCongeEntries: CongeEntry[] = [];
  isLoadingAllCongeEntries: boolean = true;
  allCongeEntriesError: string | null = null;

  // Propriété pour les demandes de congé des employés
  employeeCongeRequests: CongeEntry[] = [];
  isLoadingEmployeeRequests: boolean = true;
  employeeRequestsError: string | null = null;

  employeeBalances: EmployeBalanceInfo[] = [];
  isLoadingEmployeeBalances: boolean = true;
  employeeBalancesError: string | null = null;
  employeeBalanceUpdateMessage: string | null = null;
  employeeBalanceUpdateError: string | null = null;


  feries: FerieDay[] = [];
  isLoadingFeries: boolean = true;
  feriesError: string | null = null;

  private apiUrl = 'http://localhost/api';

  constructor(
    private authService: AuthService,
    private http: HttpClient,//service Angular pour faire des requêtes HTTP (GET, POST, PUT...).
    private router: Router
  ) {
    //on  utilises le spread operator (...).
    // Ça veut dire : « crée un nouvel objet indépendant avec les mêmes propriétés que chefInfo ».
    this.updatedChefInfo = { ...this.chefInfo };
  }

  ngOnInit(): void {
    const matricule = this.authService.getUserUsername();
    if (matricule) {
      this.chefInfo.Matricule = matricule;
      this.loadChefInfo(matricule);
      this.loadAllCongeEntries();
      this.loadEmployeeCongeRequests();
      this.loadEmployeeBalances(); // Charge les soldes de tous les employés
      this.loadFeries();
    } else {
      this.chefInfoError = 'Matricule de l\'utilisateur non trouvé. Veuillez vous reconnecter.';
      this.allCongeEntriesError = 'Matricule de l\'utilisateur non trouvé.';
      this.employeeRequestsError = 'Matricule de l\'utilisateur non trouvé.';
      this.employeeBalancesError = 'Matricule de l\'utilisateur non trouvé.';
      this.feriesError = 'Matricule de l\'utilisateur non trouvé.';
      this.isLoadingChefInfo = false;
      this.isLoadingAllCongeEntries = false;
      this.isLoadingEmployeeRequests = false;
      this.isLoadingEmployeeBalances = false;
      this.isLoadingFeries = false;
      this.router.navigate(['/login']);
    }
  }

  setActiveSection(section: typeof this.activeSection): void {
    this.activeSection = section;
    if (section === 'manageEmployeeBalances') {
      this.loadEmployeeBalances();
    } else if (section === 'manageEmployeeRequests') {
      this.loadEmployeeCongeRequests();
    } else if (section === 'congeHistory') {
      this.loadAllCongeEntries();
    } else if (section === 'personalInfo') {
      this.loadChefInfo(this.chefInfo.Matricule);
    }
  }

  calculateNbrJ(request: CongeRequest): void {
    if (request.dateD && request.dateF) {
      const dateDebut = new Date(request.dateD);
      const dateFin = new Date(request.dateF);
      if (isNaN(dateDebut.getTime()) || isNaN(dateFin.getTime())) {
        request.nbrJ = null;
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
        //Compter les jours ouvrables
        if (!isWeekend && !isFerie) {
          countDays++;
        }
        currentDate.setDate(currentDate.getDate() + 1);//On avance la date d’un jour pour continuer la boucle.
      }
      request.nbrJ = countDays;
    } else {
      request.nbrJ = null;
    }
  }

  calculateAnnee(request: CongeRequest): void {
    if (request.dateD) {
      request.annee = new Date(request.dateD).getFullYear();
    } else {
      request.annee = null;
    }
  }

  onChefCongeDateChange(): void {
    this.calculateNbrJ(this.newChefCongeRequest);
    this.calculateAnnee(this.newChefCongeRequest);
  }

  loadChefInfo(matricule: string): void {
    this.isLoadingChefInfo = true;
    this.chefInfoError = null;

    this.http.get<any>(`${this.apiUrl}/get_personal_info.php?matricule=${matricule}`).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.chefInfo = {
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
          this.updatedChefInfo = { ...this.chefInfo };
        } else {
          this.chefInfoError = response.message || 'Impossible de charger les informations personnelles du Chef.';
        }
        this.isLoadingChefInfo = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des infos personnelles du Chef:', err);
        this.chefInfoError = 'Erreur réseau ou serveur lors du chargement des informations personnelles du Chef.';
        this.isLoadingChefInfo = false;
      }
    });
  }

  toggleEditChefInfo(): void {
    this.isEditingChefInfo = !this.isEditingChefInfo;//isEditingChefInfo est un booléen qui indique si le formulaire est en mode édition (true) ou non (false).
    this.chefInfoUpdateMessage = null;
    this.chefInfoUpdateError = null;
    if (this.isEditingChefInfo) {
      this.updatedChefInfo = { ...this.chefInfo };
    }
  }
//sauvegarder les modifications apportées aux informations personnelles
  saveChefInfo(): void {
    this.chefInfoUpdateMessage = null;
    this.chefInfoUpdateError = null;

    if (!this.updatedChefInfo.Matricule || !this.updatedChefInfo.CIN || !this.updatedChefInfo.Nom || !this.updatedChefInfo.Prenom) {
      this.chefInfoUpdateError = 'Les champs Matricule, CIN, Nom et Prénom sont obligatoires.';
      return;
    }

    this.http.post<any>(`${this.apiUrl}/update_personal_info.php`, this.updatedChefInfo).subscribe({
      next: (response) => {
        if (response.success) {
          this.chefInfoUpdateMessage = response.message || 'Informations personnelles du Chef mises à jour avec succès !';
          this.isEditingChefInfo = false;
          this.loadChefInfo(this.chefInfo.Matricule);
        } else {
          this.chefInfoUpdateError = response.message || 'Échec de la mise à jour des informations personnelles du Chef.';
        }
      },
      error: (err) => {
        console.error('Erreur lors de la mise à jour des infos personnelles du Chef:', err);
        this.chefInfoUpdateError = 'Erreur réseau ou serveur lors de la mise à jour des informations personnelles du Chef.';
      }
    });
  }

  submitChefCongeRequest(): void {
    this.chefCongeRequestMessage = null;
    this.chefCongeRequestError = null;

    if (!this.newChefCongeRequest.dateD || !this.newChefCongeRequest.dateF || !this.newChefCongeRequest.remarque) {
      this.chefCongeRequestError = 'Veuillez remplir tous les champs de la demande de congé.';
      return;
    }

    if (new Date(this.newChefCongeRequest.dateD) > new Date(this.newChefCongeRequest.dateF)) {
      this.chefCongeRequestError = 'La date de début ne peut pas être après la date de fin.';
      return;
    }

    this.calculateNbrJ(this.newChefCongeRequest);
    const totalAvailableDaysChef = this.chefInfo.SoldeCongeAnnuel + this.chefInfo.SoldeCongeAnneePrecedente;

    if (this.newChefCongeRequest.nbrJ === null || this.newChefCongeRequest.nbrJ <= 0) {
      this.chefCongeRequestError = 'Le nombre de jours de congé doit être supérieur à 0.';
      return;
    }
    if (this.newChefCongeRequest.nbrJ > totalAvailableDaysChef) {
      this.chefCongeRequestError = `La durée de votre demande (${this.newChefCongeRequest.nbrJ} jours) dépasse votre solde de congés total disponible (${totalAvailableDaysChef} jours).`;
      return;
    }

//c’est un objet  qui contient toutes les données à envoyer au backend
    const payload = {
      Matricule: this.chefInfo.Matricule,
      DateD: this.newChefCongeRequest.dateD,
      DateF: this.newChefCongeRequest.dateF,
      NbrJ: this.newChefCongeRequest.nbrJ,
      Annee: this.newChefCongeRequest.annee,
      Remarque: this.newChefCongeRequest.remarque
    };

    this.http.post<any>(`${this.apiUrl}/submit_conge_request.php`, payload).subscribe({
      next: (response) => {
        if (response.success) {
          this.chefCongeRequestMessage = response.message || 'Demande de congé du Chef soumise avec succès !';
          this.newChefCongeRequest = { dateD: '', dateF: '', nbrJ: null, annee: null, remarque: '' };
          this.loadAllCongeEntries();
          this.loadChefInfo(this.chefInfo.Matricule);
        } else {
          this.chefCongeRequestError = response.message || 'Échec de la soumission de la demande de congé du Chef.';
        }
      },
      error: (err) => {
        console.error('Erreur lors de la soumission de la demande de congé du Chef:', err);
        this.chefCongeRequestError = 'Erreur réseau ou serveur lors de la soumission de la demande de congé du Chef.';
      }
    });
  }

  loadAllCongeEntries(): void {
    this.isLoadingAllCongeEntries = true;
    this.allCongeEntriesError = null;

    this.http.get<any>(`${this.apiUrl}/get_all_conge_entries.php`).subscribe({
      next: (response) => {
        if (response.success && Array.isArray(response.data)) {
          this.allCongeEntries = response.data.filter((entry: CongeEntry) => entry.Matricule === this.chefInfo.Matricule).map((item: any) => ({
            IdC: item.IdC,
            Matricule: item.Matricule,
            DateD: item.DateD,
            DateF: item.DateF,
            NbrJ: item.NbrJ,
            Annee: item.Annee,
            Remarque: item.Remarque,
            Statut: item.Statut,
            commentaire_chef: item.commentaire_chef,
            Nom: item.Nom,
            Prenom: item.Prenom,
            SoldeCongeAnnuel: item.SoldeCongeAnnuel,
            SoldeCongeAnneePrecedente: item.SoldeCongeAnneePrecedente
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

  loadEmployeeCongeRequests(): void {
    this.isLoadingEmployeeRequests = true;
    this.employeeRequestsError = null;
//On vérifie que la requête serveur a réussi (response.success) et que les données reçues sont bien un tableau (Array.isArray(response.data)).
    /* on filtre req.Statut === 'En attente' : seules les demandes qui n’ont pas encore été traitées par le chef.
req.Matricule !== this.chefInfo.Matricule : on exclut les demandes du chef lui-même.*/
    this.http.get<any>(`${this.apiUrl}/get_all_conge_entries.php`).subscribe({
      next: (response) => {
        if (response.success && Array.isArray(response.data)) {
          this.employeeCongeRequests = response.data
            .filter((req: CongeEntry) => req.Statut === 'En attente' && req.Matricule !== this.chefInfo.Matricule)
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
              SoldeCongeAnneePrecedente: item.SoldeCongeAnneePrecedente
            }));
        } else {
          this.employeeRequestsError = response.message || 'Impossible de charger les demandes de congé des employés.';
          this.employeeCongeRequests = [];
        }
        this.isLoadingEmployeeRequests = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des demandes de congés des employés:', err);
        this.employeeRequestsError = 'Erreur réseau ou serveur lors du chargement des demandes de congés des employés.';
        this.isLoadingEmployeeRequests = false;
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
          this.loadEmployeeCongeRequests();
          this.loadAllCongeEntries();
          this.loadEmployeeBalances();
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

  loadEmployeeBalances(): void {
    this.isLoadingEmployeeBalances = true;
    this.employeeBalancesError = null;
    this.employeeBalanceUpdateMessage = null;
    this.employeeBalanceUpdateError = null;

    this.http.get<any>(`${this.apiUrl}/get_all_persons_with_balances.php`).subscribe({
      next: (response) => {
        if (response.success && Array.isArray(response.data)) {
          // Filtrer pour exclure le chef de service lui-même de cette liste
          this.employeeBalances = response.data
            .filter((item: EmployeBalanceInfo) => item.Matricule !== this.chefInfo.Matricule)
            .map((item: any) => ({
              Matricule: item.Matricule,
              Nom: item.Nom,
              Prenom: item.Prenom,
              SoldeCongeAnnuel: item.SoldeCongeAnnuel !== null ? parseInt(item.SoldeCongeAnnuel) : 22,
              SoldeCongeAnneePrecedente: item.SoldeCongeAnneePrecedente !== null ? parseInt(item.SoldeCongeAnneePrecedente) : 0
            }));
        } else {
          this.employeeBalancesError = response.message || 'Impossible de charger les soldes des employés.';
          this.employeeBalances = [];
        }
        this.isLoadingEmployeeBalances = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des soldes des employés:', err);
        this.employeeBalancesError = 'Erreur réseau ou serveur lors du chargement des soldes des employés.';
        this.isLoadingEmployeeBalances = false;
      }
    });
  }

  updateEmployeeCarryOverBalance(employee: EmployeBalanceInfo): void {
    this.employeeBalanceUpdateMessage = null;
    this.employeeBalanceUpdateError = null;

    if (employee.SoldeCongeAnneePrecedente < 0) {
      this.employeeBalanceUpdateError = `Le solde reporté de ${employee.Nom} ${employee.Prenom} ne peut pas être négatif.`;
      return;
    }

    const payload = {
      matricule: employee.Matricule,
      solde: employee.SoldeCongeAnneePrecedente
    };

    this.http.post<any>(`${this.apiUrl}/update_carry_over_balance.php`, payload).subscribe({
      next: (response) => {
        if (response.success) {
          this.employeeBalanceUpdateMessage = response.message || `Solde reporté de ${employee.Nom} ${employee.Prenom} mis à jour avec succès.`;
          this.loadEmployeeBalances();
        } else {
          this.employeeBalanceUpdateError = response.message || `Échec de la mise à jour du solde reporté de ${employee.Nom} ${employee.Prenom}.`;
        }
      },
      error: (err) => {
        console.error('Erreur lors de la mise à jour du solde reporté:', err);
        this.employeeBalanceUpdateError = `Erreur réseau ou serveur lors de la mise à jour du solde reporté de ${employee.Nom} ${employee.Prenom}.`;
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
