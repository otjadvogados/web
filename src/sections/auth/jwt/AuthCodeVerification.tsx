// material-ui
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import FormHelperText from '@mui/material/FormHelperText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// third-party
import * as Yup from 'yup';
import { Formik } from 'formik';
import OtpInput from 'react-otp-input';

// project imports
import AnimateButton from 'components/@extended/AnimateButton';

// ============================|| JWT - VERIFICAÇÃO DE CÓDIGO ||============================ //

export default function AuthCodeVerification() {
  return (
    <Formik
      initialValues={{ otp: '' }}
      validationSchema={Yup.object({
        otp: Yup.string().length(4, 'O código deve ter exatamente 4 dígitos').required('O código é obrigatório')
      })}
      onSubmit={(values, { resetForm }) => {
        resetForm();
        console.log(values);

        // remove o foco após o envio
        const activeElement = document.activeElement as HTMLElement | null;
        if (activeElement) activeElement.blur();
      }}
    >
      {({ errors, handleSubmit, touched, values, setFieldValue }) => (
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid size={12}>
              <Box
                sx={(theme) => ({
                  '& input': {
                    border: '1px solid',
                    borderColor: 'divider',
                    ...(touched.otp && errors.otp && { borderColor: 'error.main' }),
                    '&:focus-visible': {
                      outline: 'none !important',
                      borderColor: 'primary.main',
                      boxShadow: theme.customShadows.primary,
                      ...(touched.otp && errors.otp && { borderColor: 'error.main', boxShadow: theme.customShadows.error })
                    }
                  }
                })}
              >
                <OtpInput
                  value={values.otp}
                  onChange={(otp) => setFieldValue('otp', otp)}
                  inputType="tel"
                  shouldAutoFocus
                  renderInput={(props, index) => (
                    <input
                      {...props}
                      onKeyDown={(e) => {
                        if (e.key === 'Tab') {
                          e.preventDefault();
                        } else if (e.key === 'Backspace' && !props.value) {
                          const previousInput = document.getElementById(`otp-input-${index - 1}`);
                          if (previousInput) {
                            previousInput.focus();
                          }
                        } else if (e.key !== 'Backspace') {
                          const nextInput = document.getElementById(`otp-input-${index + 1}`);
                          if (nextInput && props.value) {
                            setTimeout(() => {
                              nextInput.focus();
                            }, 0);
                          }
                        }
                        props.onKeyDown?.(e);
                      }}
                    />
                  )}
                  numInputs={4}
                  containerStyle={{ justifyContent: 'space-between', margin: -8 }}
                  inputStyle={{ width: '100%', margin: '8px', padding: '10px', outline: 'none', borderRadius: 4 }}
                />
                {touched.otp && errors.otp && (
                  <FormHelperText error id="standard-weight-helper-text-otp">
                    {errors.otp}
                  </FormHelperText>
                )}
              </Box>
            </Grid>
            <Grid size={12}>
              <AnimateButton>
                <Button disableElevation fullWidth size="large" type="submit" variant="contained">
                  Continuar
                </Button>
              </AnimateButton>
            </Grid>
            <Grid size={12}>
              <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
                <Typography>Não recebeu o e-mail? Verifique sua caixa de spam ou</Typography>
                <Typography variant="body1" sx={{ minWidth: 85, ml: 2, textDecoration: 'none', cursor: 'pointer' }} color="primary">
                  Reenviar código
                </Typography>
              </Stack>
            </Grid>
          </Grid>
        </form>
      )}
    </Formik>
  );
}
