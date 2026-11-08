import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { IamStore } from '../../../application/iam.store';
import { SignInCommand } from '../../../domain/model/sign-in.command';
import { HOME_ROUTE, SignInForm } from './sign-in-form';

describe('SignInForm', () => {
  let signIn: ReturnType<typeof vi.fn>;
  let component: SignInForm;

  beforeEach(() => {
    signIn = vi.fn();
    TestBed.configureTestingModule({
      imports: [SignInForm],
      providers: [
        provideTranslateService({ lang: 'es' }),
        { provide: IamStore, useValue: { signIn, loading: signal(false), error: signal(null) } },
      ],
    });
    component = TestBed.createComponent(SignInForm).componentInstance;
  });

  it('does not call the store while the form is invalid', () => {
    component.onSubmit();
    expect(signIn).not.toHaveBeenCalled();
    expect(component.signInForm.touched).toBe(true);
  });

  it('signs in with the trimmed username and goes home', () => {
    component.signInForm.setValue({ username: ' cmendoza ', password: 'secret' });
    component.onSubmit();
    const [command, navigateTo] = signIn.mock.calls[0] as [SignInCommand, string[]];
    expect(command.username).toBe('cmendoza');
    expect(command.password).toBe('secret');
    expect(navigateTo).toEqual(HOME_ROUTE);
  });
});
