/*C'est un test unitaire automatique. Son rôle est de vérifier que ton
 composant LoginComponent se crée correctement et fonctionne comme prévu.*/
import { ComponentFixture, TestBed } from '@angular/core/testing';
/*TestBed : permet de configurer et créer des environnements de test Angular.
ComponentFixture : donne un accès au composant dans le test (DOM, propriétés, etc.).*/

import { LoginComponent } from './login';
//describe est une fonction Jasmine qui groupe une suite de tests.
//oici les tests pour LoginComponent
describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
//5. Avant chaque test : beforeEach()

  beforeEach(async () => {
    //On configure un module de test Angular.
    await TestBed.configureTestingModule({
      imports: [LoginComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
//un test unitaire.
  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
