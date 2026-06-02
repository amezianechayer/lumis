export const colors = {
  bg:           '#0D0D0F',
  bgCard:       'rgba(255,255,255,0.04)',
  border:       'rgba(201,130,107,0.18)',
  borderLight:  'rgba(232,213,192,0.08)',
  primary:      '#C9826B',
  primaryMuted: 'rgba(201,130,107,0.15)',
  cream:        '#E8D5C0',
  creamMuted:   'rgba(232,213,192,0.45)',
  creamFaint:   'rgba(232,213,192,0.2)',
  success:      '#5DCAA5',
  danger:       '#F09595',
}

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  full: 9999,
}

export const text = {
  h1:      { fontSize: 28, fontWeight: '300' as const, letterSpacing: 0.2,  color: colors.cream },
  h2:      { fontSize: 22, fontWeight: '300' as const, letterSpacing: 0.1,  color: colors.cream },
  h3:      { fontSize: 17, fontWeight: '400' as const,                       color: colors.cream },
  body:    { fontSize: 14, fontWeight: '400' as const, lineHeight: 22,       color: colors.creamMuted },
  small:   { fontSize: 12, fontWeight: '400' as const,                       color: colors.creamMuted },
  label:   { fontSize: 11, fontWeight: '400' as const, letterSpacing: 0.08, color: colors.creamFaint },
  wordmark:{ fontSize: 28, fontWeight: '300' as const, letterSpacing: 4,    color: colors.cream },
  tagline: { fontSize: 11, fontWeight: '400' as const, letterSpacing: 3,    color: colors.primary },
}

export const ui = {
  card: {
    backgroundColor: colors.bgCard,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 20,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.sm + 2,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: colors.cream,
  },
  btnPrimary: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm + 2,
    paddingVertical: 13,
    alignItems: 'center' as const,
  },
  btnPrimaryText: {
    color: '#0D0D0F',
    fontSize: 14,
    fontWeight: '500' as const,
    letterSpacing: 0.04,
  },
  btnGhost: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 0.5,
    borderColor: colors.borderLight,
    borderRadius: radius.sm + 2,
    paddingVertical: 11,
    alignItems: 'center' as const,
  },
  btnGhostText: {
    color: colors.creamMuted,
    fontSize: 13,
  },
}
