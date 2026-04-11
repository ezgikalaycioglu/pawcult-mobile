import { StyleSheet } from 'react-native';

export const authScreenStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  brandIcon: {
    fontSize: 34,
    marginRight: 10,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  form: {
    marginTop: 32,
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: '#8b5cf6',
  },
  primaryButtonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryButton: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  divider: {
    height: 1,
    marginVertical: 4,
    backgroundColor: '#e2e8f0',
  },
  secondaryButtonText: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
  },
  secondaryButtonLink: {
    color: '#8b5cf6',
    fontWeight: '600',
  },
  helperText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#64748b',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#dc2626',
    textAlign: 'center',
  },
  successText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#15803d',
    textAlign: 'center',
  },
});
