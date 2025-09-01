import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthGuard } from './auth-guard';
import { AuthService } from '../services/auth.service';

class MockAuthService {
  isLoggedIn = jasmine.createSpy('isLoggedIn');
}

class MockRouter {
  navigate = jasmine.createSpy('navigate'); // Create a spy for navigate method
}

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let authService: MockAuthService;
  let router: MockRouter;

  beforeEach(() => {
    // Configure the testing module with mocks for dependencies
    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        { provide: AuthService, useClass: MockAuthService },
        { provide: Router, useClass: MockRouter },
        { provide: ActivatedRouteSnapshot, useValue: {} },
        { provide: RouterStateSnapshot, useValue: { url: '/test' } }
      ]
    });

    guard = TestBed.inject(AuthGuard);
    authService = TestBed.inject(AuthService) as unknown as MockAuthService;
    router = TestBed.inject(Router) as unknown as MockRouter;
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('should return true if user is logged in', () => {
    authService.isLoggedIn.and.returnValue(true);
    expect(guard.canActivate({} as ActivatedRouteSnapshot, { url: '/dashboard' } as RouterStateSnapshot)).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should return false and navigate to login if user is not logged in', () => {
    authService.isLoggedIn.and.returnValue(false);
    expect(guard.canActivate({} as ActivatedRouteSnapshot, { url: '/dashboard' } as RouterStateSnapshot)).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
