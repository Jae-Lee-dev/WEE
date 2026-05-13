import {
  ForgotPasswordScreen,
  LoginScreen,
  SetupGuideScreen,
  SignupScreen,
  WorkspaceOnboardingScreen,
} from "@/features/entry";

export function LoginPage() {
  return <LoginScreen />;
}

export function SignupPage() {
  return <SignupScreen />;
}

export function ForgotPasswordPage() {
  return <ForgotPasswordScreen />;
}

export function WorkspaceOnboardingPage() {
  return <WorkspaceOnboardingScreen />;
}

export function SetupGuidePage() {
  return <SetupGuideScreen />;
}
