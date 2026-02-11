import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AuthLayout } from './AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Label } from '@/components/ui/label';

export function RegisterPage() {
    const { register, isLoading, error, clearError } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [localError, setLocalError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLocalError(null);

        if (password !== confirmPassword) {
            setLocalError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setLocalError('Password must be at least 8 characters');
            return;
        }

        try {
            await register(email, password);
            setSuccess(true);
        } catch {
            // Error is handled by context
        }
    };

    if (success) {
        return (
            <AuthLayout
                title="Check your email"
                subtitle={`We've sent a verification link to ${email}`}
            >
                <div className="flex flex-col items-center justify-center space-y-6 py-6">
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center ring-1 ring-green-500/20">
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                    </div>
                </div>
                <Button asChild variant="default" className="w-full">
                    <Link to="/login">Back to Login</Link>
                </Button>
            </AuthLayout>
        );
    }

    const displayError = localError || error;

    return (
        <AuthLayout
            title="Create an account"
            subtitle="Enter your email below to create your account"
        >
            <div className="grid gap-6">
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4">
                        {displayError && (
                            <div className="p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-md flex justify-between items-center">
                                <span>{displayError}</span>
                                <button
                                    type="button"
                                    onClick={() => { clearError(); setLocalError(null); }}
                                    className="hover:text-red-400"
                                >
                                    ✕
                                </button>
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                placeholder="name@example.com"
                                type="email"
                                autoCapitalize="none"
                                autoComplete="email"
                                autoCorrect="off"
                                disabled={isLoading}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                placeholder="••••••••"
                                type="password"
                                disabled={isLoading}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                minLength={8}
                                required
                            />
                            <p className="text-[0.8rem] text-muted-foreground">
                                Must be at least 8 characters long
                            </p>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="confirm-password">Confirm Password</Label>
                            <Input
                                id="confirm-password"
                                placeholder="••••••••"
                                type="password"
                                disabled={isLoading}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={isLoading}
                            variant="default"
                            className="w-full mt-2"
                        >
                            {isLoading && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Create Account
                        </Button>
                    </div>
                </form>

                <div className="text-center text-sm">
                    Already have an account?{" "}
                    <Link
                        to="/login"
                        className="underline underline-offset-4 hover:text-primary font-medium"
                    >
                        Sign in
                    </Link>
                </div>
            </div>
        </AuthLayout>
    );
}

export default RegisterPage;
