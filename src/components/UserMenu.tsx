import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { usePushNotifications } from '../hooks/usePushNotifications';

export function UserMenu() {
  const { user, username, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { canInstall, install } = usePWAInstall();
  const { isSupported, subscribed, subscribe, unsubscribe } = usePushNotifications();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  if (!user) return null;

  return (
    <>
      <div className="user-menu" ref={menuRef}>
        <button className="user-menu-trigger" onClick={() => setOpen(o => !o)}>
          <span className="user-menu-avatar">👤</span>
          <span className="user-menu-name">{username ?? user.email}</span>
          <span className="user-menu-caret">{open ? '▴' : '▾'}</span>
        </button>

        {open && (
          <div className="user-menu-dropdown">
            <button
              className="user-menu-item"
              onClick={() => { setOpen(false); navigate('/profile'); }}
            >
              👤 My Profile
            </button>
            {canInstall && (
              <button
                className="user-menu-item"
                onClick={() => { setOpen(false); install(); }}
              >
                📲 Download App
              </button>
            )}
            {isSupported && (
              <button
                className="user-menu-item"
                onClick={() => { setOpen(false); subscribed ? unsubscribe() : subscribe(); }}
              >
                {subscribed ? '🔕 Mute Notifications' : '🔔 Enable Notifications'}
              </button>
            )}
            <button
              className="user-menu-item user-menu-item--danger"
              onClick={() => { setOpen(false); setShowLogoutConfirm(true); }}
            >
              🚪 Log Out
            </button>
          </div>
        )}
      </div>

      {showLogoutConfirm && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-icon">🚪</div>
            <h2 className="modal-title">Log Out</h2>
            <p className="modal-body">Would you like to log out right now?</p>
            <div className="modal-actions">
              <button className="modal-ok-btn" onClick={signOut}>Yes, log out</button>
              <button className="modal-cancel-btn" onClick={() => setShowLogoutConfirm(false)}>No, stay</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
