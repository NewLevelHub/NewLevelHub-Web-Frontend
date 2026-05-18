import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { MailCheck } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { useAuthStore } from '@/shared/store/auth';
import type { InviteRegistrationPreview } from '@/shared/types';
import { authInput, authLabel, authLink, authPrimaryBtn } from '@/shared/ui/authFormStyles';

/**
 * Ссылка из письма: /invite?token=&lt;uuid&gt; (см. Celery send_invitation_email).
 * Поддерживается также /invite/:token для совместимости.
 */
export default function InviteAcceptPage() {
  const { token: pathToken } = useParams();
  const [searchParams] = useSearchParams();
  const registerByInvite = useAuthStore((s) => s.registerByInvite);
  const token = useMemo(() => pathToken ?? searchParams.get('token') ?? '', [pathToken, searchParams]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');

  const inviteQuery = useQuery({
    queryKey: ['invite-registration-preview', token],
    enabled: Boolean(token),
    retry: false,
    queryFn: () =>
      apiClient
        .get<InviteRegistrationPreview>(API.auth.registerInvite, { params: { token } })
        .then((res) => res.data),
  });

  const registerMutation = useMutation({
    mutationFn: () =>
      registerByInvite({
        token,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        password,
        ...(phone.trim() ? { phone: phone.trim() } : {}),
      }),
    onError: (err) => setError(getApiErrorMessage(err, 'Не удалось зарегистрироваться по инвайту')),
  });

  function onSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Инвайт-токен не найден в ссылке');
      return;
    }
    if (password !== passwordConfirm) {
      setError('Пароли не совпадают');
      return;
    }
    if (password.length < 8) {
      setError('Пароль не короче 8 символов');
      return;
    }
    registerMutation.mutate();
  }

  if (!token) {
    return (
      <div>
        <h2 className="mb-2 text-center text-xl font-semibold">Инвайт недоступен</h2>
        <p className="text-center text-sm text-secondary">
          В ссылке отсутствует токен. Открой ссылку вида <code>/invite?token=&lt;uuid&gt;</code>.
        </p>
      </div>
    );
  }

  if (inviteQuery.isLoading) {
    return <p className="text-center text-sm text-secondary">Проверяем инвайт...</p>;
  }

  if (inviteQuery.isError || !inviteQuery.data) {
    return (
      <div className="space-y-4">
        <h2 className="text-center text-xl font-semibold">Инвайт недействителен</h2>
        <p className="rounded-lg border border-red-200 bg-danger-subtle px-3 py-2 text-sm text-danger dark:border-red-900/40">
          {getApiErrorMessage(inviteQuery.error, 'Ссылка невалидна, истекла или уже использована')}
        </p>
        <button type="button" onClick={() => inviteQuery.refetch()} className={authPrimaryBtn}>
          Проверить снова
        </button>
      </div>
    );
  }

  if (registerMutation.isSuccess) {
    return (
      <div className="space-y-4 text-center">
        <MailCheck className="mx-auto h-12 w-12 text-green-500" />
        <h2 className="text-xl font-semibold">Подтвердите почту</h2>
        <p className="text-sm text-muted">
          Мы отправили письмо с подтверждением на{' '}
          <span className="font-medium text-primary">{inviteQuery.data?.email}</span>.
          Перейдите по ссылке в письме, чтобы активировать аккаунт и войти.
        </p>
        <Link to="/login" className={authLink}>
          Вернуться на страницу входа
        </Link>
      </div>
    );
  }

  const invite = inviteQuery.data;

  return (
    <div>
      <h2 className="mb-1 text-center text-xl font-semibold">Принять приглашение</h2>
      <p className="mb-6 text-center text-sm text-muted">
        Компания: <span className="font-medium text-primary">{invite.company_name}</span>
      </p>

      <form onSubmit={onSubmit} className="space-y-3">
        {invite.is_guest_upgrade ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200">
            Ваш гостевой аккаунт будет переведён в роль{' '}
            <span className="font-medium">{invite.role}</span> в компании{' '}
            <span className="font-medium">{invite.company_name}</span>. После подтверждения
            email вы сможете войти с новыми правами.
          </div>
        ) : null}
        {error ? (
          <div className="rounded-lg border border-red-200 bg-danger-subtle px-3 py-2 text-sm text-danger dark:border-red-900/40">
            {error}
          </div>
        ) : null}

        <div>
          <label htmlFor="invite-email" className={authLabel}>
            Email
          </label>
          <input id="invite-email" value={invite.email} readOnly className={`${authInput} opacity-70`} />
        </div>

        <div>
          <label htmlFor="invite-role" className={authLabel}>
            Роль
          </label>
          <input id="invite-role" value={invite.role} readOnly className={`${authInput} opacity-70`} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="invite-first" className={authLabel}>
              Имя
            </label>
            <input
              id="invite-first"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={authInput}
            />
          </div>
          <div>
            <label htmlFor="invite-last" className={authLabel}>
              Фамилия
            </label>
            <input
              id="invite-last"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={authInput}
            />
          </div>
        </div>

        <div>
          <label htmlFor="invite-phone" className={authLabel}>
            Телефон <span className="text-gray-600">(необязательно)</span>
          </label>
          <input
            id="invite-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={authInput}
          />
        </div>

        <div>
          <label htmlFor="invite-pass" className={authLabel}>
            Пароль
          </label>
          <input
            id="invite-pass"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authInput}
          />
        </div>

        <div>
          <label htmlFor="invite-pass2" className={authLabel}>
            Пароль еще раз
          </label>
          <input
            id="invite-pass2"
            type="password"
            required
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            className={authInput}
          />
        </div>

        <button type="submit" disabled={registerMutation.isPending} className={authPrimaryBtn}>
          {registerMutation.isPending ? 'Регистрация...' : 'Зарегистрироваться по приглашению'}
        </button>
      </form>

      <p className="mt-6 text-center">
        <Link to="/login" className={authLink}>
          Уже есть аккаунт — войти
        </Link>
      </p>
    </div>
  );
}
