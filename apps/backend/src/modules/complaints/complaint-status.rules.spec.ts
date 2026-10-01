import {
  isValidTransition,
  getValidTransitions,
  getResolverTransitions,
} from './complaint-status.rules';

describe('complaint-status.rules', () => {
  describe('isValidTransition', () => {
    it('allows the documented happy path', () => {
      expect(isValidTransition('SUBMITTED', 'ACKNOWLEDGED')).toBe(true);
      expect(isValidTransition('ACKNOWLEDGED', 'IN_PROGRESS')).toBe(true);
      expect(isValidTransition('IN_PROGRESS', 'RESOLVED')).toBe(true);
      expect(isValidTransition('RESOLVED', 'CLOSED')).toBe(true);
    });

    it('allows escalation from every active state', () => {
      expect(isValidTransition('SUBMITTED', 'ESCALATED')).toBe(true);
      expect(isValidTransition('ACKNOWLEDGED', 'ESCALATED')).toBe(true);
      expect(isValidTransition('IN_PROGRESS', 'ESCALATED')).toBe(true);
    });

    it('allows reopening a resolved complaint', () => {
      expect(isValidTransition('RESOLVED', 'IN_PROGRESS')).toBe(true);
    });

    it('allows an escalated complaint to return to the workflow', () => {
      expect(isValidTransition('ESCALATED', 'IN_PROGRESS')).toBe(true);
      expect(isValidTransition('ESCALATED', 'ACKNOWLEDGED')).toBe(true);
    });

    it('rejects skipping states', () => {
      expect(isValidTransition('SUBMITTED', 'RESOLVED')).toBe(false);
      expect(isValidTransition('SUBMITTED', 'IN_PROGRESS')).toBe(false);
      expect(isValidTransition('ACKNOWLEDGED', 'RESOLVED')).toBe(false);
    });

    it('CLOSED is terminal', () => {
      expect(isValidTransition('CLOSED', 'RESOLVED')).toBe(false);
      expect(isValidTransition('CLOSED', 'ESCALATED')).toBe(false);
      expect(isValidTransition('CLOSED', 'IN_PROGRESS')).toBe(false);
    });

    it('rejects self-transitions', () => {
      expect(isValidTransition('SUBMITTED', 'SUBMITTED')).toBe(false);
      expect(isValidTransition('IN_PROGRESS', 'IN_PROGRESS')).toBe(false);
      expect(isValidTransition('ESCALATED', 'ESCALATED')).toBe(false);
    });
  });

  describe('getValidTransitions', () => {
    it('returns a copy — mutating the result must not corrupt the rules', () => {
      const transitions = getValidTransitions('SUBMITTED');
      transitions.push('CLOSED');
      expect(isValidTransition('SUBMITTED', 'CLOSED')).toBe(false);
    });

    it('returns an empty list for CLOSED', () => {
      expect(getValidTransitions('CLOSED')).toEqual([]);
    });
  });

  describe('getResolverTransitions', () => {
    it('never offers ESCALATED — escalation belongs to the SLA cron / admins', () => {
      (
        [
          'SUBMITTED',
          'ACKNOWLEDGED',
          'IN_PROGRESS',
          'RESOLVED',
          'ESCALATED',
        ] as const
      ).forEach((status) => {
        expect(getResolverTransitions(status)).not.toContain('ESCALATED');
      });
    });

    it('keeps the normal workflow steps', () => {
      expect(getResolverTransitions('SUBMITTED')).toEqual(['ACKNOWLEDGED']);
      expect(getResolverTransitions('IN_PROGRESS')).toEqual(['RESOLVED']);
      expect(getResolverTransitions('RESOLVED')).toEqual([
        'CLOSED',
        'IN_PROGRESS',
      ]);
    });

    it('is empty for CLOSED', () => {
      expect(getResolverTransitions('CLOSED')).toEqual([]);
    });
  });
});
