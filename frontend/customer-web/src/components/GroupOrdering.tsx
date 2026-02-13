import { useState, useEffect } from 'react';
import { Users, Share2, DollarSign, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { useCreateGroupOrder, useJoinGroupOrder, useGroupOrderWebSocket } from '../hooks/useGroupOrdering';
import { AxiosErrorWithResponse } from '../types';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import './GroupOrdering.css';

interface GroupMember {
  id: string;
  name: string;
  avatar?: string;
  items: CartItem[];
  total: number;
  isReady: boolean;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  restaurant: string;
}

interface GroupOrder {
  id: string;
  code: string;
  host: string;
  members: GroupMember[];
  restaurant?: string;
  status: 'active' | 'ordering' | 'ready' | 'completed';
  createdAt: string;
  total: number;
}

type GroupOrderMutationMessage =
  | { type: 'member-joined'; member: GroupMember }
  | { type: 'item-added'; memberId: string; item: CartItem }
  | { type: 'member-ready'; memberId: string };

type GroupOrderSocketMessage = { order: GroupOrder } | GroupOrderMutationMessage;

export function GroupOrdering() {
  const { user } = useAuth();
  const [groupOrder, setGroupOrder] = useState<GroupOrder | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const { socket } = useWebSocket(user?.id || null);

  // Initialize WebSocket for real-time updates
  useGroupOrderWebSocket(
    groupOrder?.id || null,
    (updatedOrder: GroupOrder) => {
      setGroupOrder(updatedOrder);
    }
  );

  // WebSocket Event Listeners
  useEffect(() => {
    if (socket && groupOrder) {
      const roomName = `group-orders/${groupOrder.id}`;
      socket.emit('join-room', roomName);

      socket.on('group-order-update', (data: GroupOrderSocketMessage) => {
        if ('order' in data) {
          setGroupOrder(data.order);
        } else {
          handleGroupUpdate(data);
        }
      });

      return () => {
        socket.emit('leave-room', roomName);
        socket.off('group-order-update');
      };
    }
    return undefined;
  }, [socket, groupOrder]);

  const createMutation = useCreateGroupOrder();
  const joinMutation = useJoinGroupOrder();
  const { showToast } = useToast();

  const createGroupOrder = async () => {
    setIsCreating(true);
    try {
      const result = await createMutation.mutateAsync({});
      setGroupOrder(result);
      void showShareDialog(result.code);
      showToast('Gruppenbestellung erstellt!', 'success');
    } catch (error: unknown) {
      const axiosError = error as AxiosErrorWithResponse;
      showToast(axiosError.response?.data?.message || 'Fehler beim Erstellen', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const joinGroupOrder = async () => {
    if (!joinCode.trim()) {
      showToast('Bitte Code eingeben', 'error');
      return;
    }
    
    setIsJoining(true);
    try {
      const result = await joinMutation.mutateAsync({ code: joinCode.trim().toUpperCase() });
      setGroupOrder(result);
      setJoinCode('');
      showToast('Gruppenbestellung beigetreten!', 'success');
    } catch (error: unknown) {
      const axiosError = error as AxiosErrorWithResponse;
      showToast(axiosError.response?.data?.message || 'Fehler beim Beitreten', 'error');
    } finally {
      setIsJoining(false);
    }
  };

  const showShareDialog = async (code: string) => {
    const shareUrl = `${window.location.origin}/group/${code}`;
    const shareData = {
      title: 'Bestelle mit mir!',
      text: `Tritt meiner Gruppenbestellung bei! Code: ${code}`,
      url: shareUrl,
    };

    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
        await navigator.share(shareData);
        showToast('Einladungslink geteilt!', 'success');
        return;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
    }

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        showToast('Link in Zwischenablage kopiert!', 'success');
        return;
      } catch {
        showToast('Link konnte nicht kopiert werden.', 'error');
        return;
      }
    }

    showToast(`Gruppen-Code: ${code}`, 'info');
  };

  const handleGroupUpdate = (data: GroupOrderMutationMessage) => {
    if (data.type === 'member-joined') {
      setGroupOrder(prev => prev ? {
        ...prev,
        members: [...prev.members, data.member]
      } : null);
    } else if (data.type === 'item-added') {
      setGroupOrder(prev => {
        if (!prev) return null;
        const updatedMembers = prev.members.map((member) =>
          member.id === data.memberId
            ? {
                ...member,
                items: [...member.items, data.item],
                total: member.total + data.item.price * data.item.quantity,
              }
            : member
        );
        const updatedTotal = updatedMembers.reduce((sum, member) => sum + member.total, 0);
        return {
          ...prev,
          members: updatedMembers,
          total: updatedTotal,
        };
      });
    } else if (data.type === 'member-ready') {
      setGroupOrder(prev => prev ? {
        ...prev,
        members: prev.members.map(m => 
          m.id === data.memberId ? { ...m, isReady: true } : m
        )
      } : null);
    }
  };

  const markAsReady = () => {
    if (!groupOrder || !user) return;

    try {
      // Sende über WebSocket
      if (socket && groupOrder.id) {
        socket.emit('group-order-member-ready', {
          groupOrderId: groupOrder.id,
          memberId: user.id
        });
      } else {
        // Fallback: Direktes Update
        handleGroupUpdate({
          type: 'member-ready',
          memberId: user.id
        });
      }
    } catch (error: unknown) {
      showToast('Fehler beim Markieren als bereit', 'error');
    }
  };

  const calculateSplit = () => {
    if (!groupOrder) return { perPerson: 0, total: 0 };
    
    const total = groupOrder.members.reduce((sum, m) => sum + m.total, 0);
    const perPerson = total / groupOrder.members.length;
    
    return { total, perPerson };
  };

  const allMembersReady = groupOrder?.members.every(m => m.isReady) || false;
  const split = calculateSplit();

  if (!groupOrder) {
    return (
      <Card variant="elevated" className="group-ordering-card">
        <div className="group-ordering-header">
          <Users className="group-icon" />
          <div>
            <h3>Gruppenbestellung</h3>
            <p>Bestelle zusammen mit Freunden</p>
          </div>
        </div>

        <div className="group-ordering-actions">
          <Button
            variant="primary"
            onClick={createGroupOrder}
            disabled={isCreating}
            className="group-action-btn"
          >
            <Share2 className="btn-icon" />
            Neue Gruppe erstellen
          </Button>

          <div className="group-join-section">
            <input
              type="text"
              placeholder="Gruppen-Code eingeben"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="group-code-input"
              maxLength={6}
            />
            <Button
              variant="secondary"
              onClick={joinGroupOrder}
              disabled={isJoining || !joinCode.trim()}
            >
              Beitreten
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="elevated" className="group-ordering-card active">
      <div className="group-ordering-header">
        <Users className="group-icon" />
        <div>
          <h3>Gruppenbestellung</h3>
          <p className="group-code">Code: {groupOrder.code}</p>
        </div>
        <button
          className="group-share-btn"
          onClick={() => void showShareDialog(groupOrder.code)}
          aria-label="Teilen"
        >
          <Share2 />
        </button>
      </div>

      <div className="group-members">
        <h4>Mitglieder ({groupOrder.members.length})</h4>
        <div className="members-list">
          {groupOrder.members.map((member) => (
            <div key={member.id} className="group-member">
              <div className="member-info">
                <div className="member-avatar">
                  {member.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <div className="member-name">
                    {member.name}
                    {member.id === user?.id && ' (Du)'}
                    {member.isReady && <CheckCircle className="ready-icon" />}
                  </div>
                  <div className="member-total">
                    {member.items.length} Artikel • €{member.total.toFixed(2)}
                  </div>
                </div>
              </div>
              {member.items.length > 0 && (
                <div className="member-items">
                  {member.items.map((item) => (
                    <div key={item.id} className="member-item">
                      {item.quantity}x {item.name} - €{(item.price * item.quantity).toFixed(2)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="group-summary">
        <div className="summary-row">
          <span>Gesamt</span>
          <span className="summary-total">€{split.total.toFixed(2)}</span>
        </div>
        <div className="summary-row">
          <span>Pro Person</span>
          <span className="summary-per-person">€{split.perPerson.toFixed(2)}</span>
        </div>
      </div>

      <div className="group-actions">
        {!allMembersReady && (
          <Button
            variant="primary"
            onClick={markAsReady}
            disabled={groupOrder.members.find(m => m.id === user?.id)?.isReady}
          >
            <CheckCircle className="btn-icon" />
            Bereit zum Bestellen
          </Button>
        )}
        {allMembersReady && (
          <Button variant="primary" className="group-checkout-btn">
            <DollarSign className="btn-icon" />
            Gemeinsam bestellen (€{split.total.toFixed(2)})
          </Button>
        )}
      </div>
    </Card>
  );
}

