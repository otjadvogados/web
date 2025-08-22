import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';

// material-ui
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import IconButton from '@mui/material/IconButton';

// third-party
import * as Yup from 'yup';
import { Formik } from 'formik';

// project imports
import { APP_DEFAULT_PATH, getBrandColors } from 'config';
import axios from 'utils/axios';
import AnimateButton from 'components/@extended/AnimateButton';
import { checkToken, extractTokenFromUrl, clearTokenFromUrl } from 'utils/token-utils';

// assets
import EyeOutlined from '@ant-design/icons/EyeOutlined';
import EyeInvisibleOutlined from '@ant-design/icons/EyeInvisibleOutlined';

// Ilustração de reset
function ResetIcon({ color, stroke = 2 }: { color: string; stroke?: number }) {
    return (
        <Box
            component="svg"
            role="img"
            aria-label="Reset de senha"
            viewBox="0 0 240 180"
            sx={{ width: { xs: 180, sm: 280 }, height: 'auto' }}
        >
            <g fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
                {/* Arco (haste) – largura +~20% */}
                <path d="M103 90 v-12 a14 14 0 0 1 34 0 v12" />
                {/* Corpo – de 40 → 48, mantendo centro em 120 */}
                <rect x="96" y="90" width="48" height="50" rx="6" />
                {/* Fechadura */}
                <circle cx="120" cy="112" r="5" />
                <path d="M120 117 v10" />
            </g>
        </Box>

    );
}

// ==============================|| RESET DE SENHA ||============================== //

export default function Reset() {
    const theme = useTheme();
    const colors = getBrandColors(theme.palette.mode === 'dark');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [token, setToken] = useState<string | null>(null);
    const [tokenValid, setTokenValid] = useState<boolean | null>(null);

    // Função para validar senha forte
    const validatePassword = (password: string) => {
        return password.length >= 8 &&
            /[A-Z]/.test(password) &&
            /[a-z]/.test(password) &&
            /[0-9]/.test(password) &&
            /[^A-Za-z0-9]/.test(password);
    };

    useEffect(() => {
        const validateToken = async () => {
            // Extrai token da URL
            const extractedToken = extractTokenFromUrl();

            if (extractedToken) {
                // Precheck opcional (pode ser removido se não necessário)
                const precheck = await checkToken('reset', extractedToken);
                if (precheck.valid) {
                    setToken(extractedToken);
                    setTokenValid(true);
                } else {
                    setTokenValid(false);
                }
            } else {
                setTokenValid(false);
            }
        };

        validateToken();
    }, []);

    if (tokenValid === null) {
        return (
            <Grid
                container
                spacing={4}
                direction="column"
                alignItems="center"
                justifyContent="center"
                sx={{
                    minHeight: '100vh',
                    py: { xs: 6, sm: 8 },
                    textAlign: 'center',
                    position: 'relative',
                }}
            >
                <Grid size={12} sx={{ position: 'relative' }}>
                    <CircularProgress size={80} sx={{ color: colors.gold }} />
                </Grid>
            </Grid>
        );
    }

    if (tokenValid === false) {
        return (
            <Grid
                container
                spacing={4}
                direction="column"
                alignItems="center"
                justifyContent="center"
                sx={{
                    minHeight: '100vh',
                    py: { xs: 6, sm: 8 },
                    textAlign: 'center',
                    position: 'relative',
                }}
            >
                <Grid size={12} sx={{ position: 'relative' }}>
                    <ResetIcon color="#ef4444" />
                </Grid>

                <Grid size={12} sx={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Stack spacing={2.5} alignItems="center" sx={{ maxWidth: 720, px: 2 }}>
                        <Typography variant="h3" sx={{ fontFamily: `'Merriweather', serif`, fontWeight: 700 }}>
                            Link inválido
                        </Typography>

                        <Divider flexItem sx={{ width: 120, borderColor: colors.gold, opacity: 0.6 }} />

                        <Typography color="text.secondary">
                            O link de redefinição de senha é inválido ou expirou.
                        </Typography>

                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ pt: 1 }}>
                            <Button component={Link} to="/forgot-password" variant="contained">
                                Solicitar novo link
                            </Button>
                            <Button component={Link} to={APP_DEFAULT_PATH} variant="outlined" color="inherit">
                                Voltar ao início
                            </Button>
                        </Stack>
                    </Stack>
                </Grid>
            </Grid>
        );
    }

    return (
        <Grid
            container
            spacing={4}
            direction="column"
            alignItems="center"
            justifyContent="center"
            sx={{
                minHeight: '100vh',
                py: { xs: 6, sm: 8 },
                textAlign: 'center',
                position: 'relative',
            }}
        >
            <Grid size={12} sx={{ position: 'relative' }}>
                <ResetIcon color={colors.gold} />
            </Grid>

            <Grid size={12} sx={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Stack spacing={2.5} alignItems="center" sx={{ maxWidth: 480, px: 2 }}>
                    <Typography variant="h3" sx={{ fontFamily: `'Merriweather', serif`, fontWeight: 700 }}>
                        Definir nova senha
                    </Typography>

                    <Divider flexItem sx={{ width: 120, borderColor: colors.gold, opacity: 0.6 }} />

                    <Typography color="text.secondary">
                        Crie uma senha forte para sua conta.
                    </Typography>

                    <Formik
                        initialValues={{
                            password: '',
                            confirmPassword: '',
                            submit: null
                        }}
                        validationSchema={Yup.object().shape({
                            password: Yup.string()
                                .max(255)
                                .required('A senha é obrigatória')
                                .test('password-strength', 'A senha não atende aos requisitos', function (value) {
                                    if (!value) return true;
                                    return validatePassword(value);
                                }),
                            confirmPassword: Yup.string()
                                .required('A confirmação de senha é obrigatória')
                                .test('confirmPassword', 'As senhas devem ser iguais!', (confirmPassword, yup) => yup.parent.password === confirmPassword)
                        })}
                        onSubmit={async (values, { setErrors, setStatus, setSubmitting }) => {
                            try {
                                // Faz a requisição para o backend
                                const response = await axios.post('/auth/reset-password', {
                                    token,
                                    password: values.password
                                });

                                // Limpa o token da URL
                                clearTokenFromUrl();

                                setStatus({ success: true });
                                setSubmitting(false);

                                // Redireciona para login após sucesso
                                setTimeout(() => {
                                    window.location.href = '/login';
                                }, 1500);
                            } catch (err: any) {
                                console.error(err);
                                setStatus({ success: false });
                                setErrors({ submit: err.response?.data?.message || 'Erro ao redefinir senha' });
                                setSubmitting(false);
                            }
                        }}
                    >
                        {({ errors, handleBlur, handleChange, handleSubmit, isSubmitting, touched, values }) => (
                            <form noValidate onSubmit={handleSubmit} style={{ width: '100%' }}>
                                <Stack spacing={3} sx={{ width: '100%' }}>
                                    <FormControl fullWidth>
                                        <InputLabel htmlFor="password-reset">Nova senha</InputLabel>
                                        <OutlinedInput
                                            fullWidth
                                            error={Boolean(touched.password && errors.password)}
                                            id="password-reset"
                                            type={showPassword ? 'text' : 'password'}
                                            value={values.password}
                                            name="password"
                                            onBlur={handleBlur}
                                            onChange={handleChange}
                                            endAdornment={
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        aria-label="alternar visibilidade da senha"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        edge="end"
                                                        color="secondary"
                                                    >
                                                        {showPassword ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                                                    </IconButton>
                                                </InputAdornment>
                                            }
                                            placeholder="Sua nova senha"
                                        />
                                        {touched.password && errors.password && (
                                            <FormHelperText error>{errors.password}</FormHelperText>
                                        )}
                                        <FormHelperText sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                                            Mínimo 8 caracteres, com maiúscula, minúscula, número e símbolo.
                                        </FormHelperText>
                                    </FormControl>

                                    <FormControl fullWidth>
                                        <InputLabel htmlFor="confirm-password-reset">Confirmar senha</InputLabel>
                                        <OutlinedInput
                                            fullWidth
                                            error={Boolean(touched.confirmPassword && errors.confirmPassword)}
                                            id="confirm-password-reset"
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            value={values.confirmPassword}
                                            name="confirmPassword"
                                            onBlur={handleBlur}
                                            onChange={handleChange}
                                            endAdornment={
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        aria-label="alternar visibilidade da confirmação"
                                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                        edge="end"
                                                        color="secondary"
                                                    >
                                                        {showConfirmPassword ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                                                    </IconButton>
                                                </InputAdornment>
                                            }
                                            placeholder="Confirme a senha"
                                        />
                                        {touched.confirmPassword && errors.confirmPassword && (
                                            <FormHelperText error>{errors.confirmPassword}</FormHelperText>
                                        )}
                                    </FormControl>

                                    {errors.submit && (
                                        <FormHelperText error>{errors.submit}</FormHelperText>
                                    )}

                                    <AnimateButton>
                                        <Button
                                            disableElevation
                                            disabled={isSubmitting}
                                            fullWidth
                                            size="large"
                                            type="submit"
                                            variant="contained"
                                            color="primary"
                                        >
                                            Atualizar senha
                                        </Button>
                                    </AnimateButton>
                                </Stack>
                            </form>
                        )}
                    </Formik>
                </Stack>
            </Grid>
        </Grid>
    );
}
