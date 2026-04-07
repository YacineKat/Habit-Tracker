import { useEffect, useRef, useState } from 'react';

export default function useHabitReorder({ setHabits }) {
  const [isHabitReordering, setIsHabitReordering] = useState(false);
  const habitsListRef = useRef(null);

  useEffect(() => {
    const habitsList = habitsListRef.current;
    if (!habitsList) return undefined;

    const REORDER_HOLD_MS = 220;
    const REORDER_MOVE_CANCEL_PX = 18;
    const REORDER_SMOOTHING = 0.34;
    const REORDER_WOBBLE_X = 2.2;
    const REORDER_WOBBLE_DEG = 0.9;
    const REORDER_WOBBLE_SPEED = 0.018;

    let reorderPressTimer = null;
    let reorderPointerId = null;
    let reorderPointerCaptureEl = null;
    let reorderCandidateItem = null;
    let reorderDragItem = null;
    let reorderPlaceholder = null;

    let reorderStartX = 0;
    let reorderStartY = 0;
    let reorderPointerOffsetY = 0;
    let reorderDragBaseTop = 0;
    let reorderDragTargetTop = 0;
    let reorderDragVisualTop = 0;
    let reorderDragStartedAt = 0;
    let reorderAnimationFrame = null;
    let reordering = false;

    function clearReorderPressTimer() {
      if (!reorderPressTimer) return;
      clearTimeout(reorderPressTimer);
      reorderPressTimer = null;
    }

    function stopReorderAnimation() {
      if (!reorderAnimationFrame) return;
      cancelAnimationFrame(reorderAnimationFrame);
      reorderAnimationFrame = null;
    }

    function releaseReorderPointerCapture() {
      if (!reorderPointerCaptureEl || reorderPointerId === null) return;
      if (!reorderPointerCaptureEl.releasePointerCapture) return;
      try {
        if (reorderPointerCaptureEl.hasPointerCapture && reorderPointerCaptureEl.hasPointerCapture(reorderPointerId)) {
          reorderPointerCaptureEl.releasePointerCapture(reorderPointerId);
        }
      } catch (err) {
        // Ignore capture release errors.
      }
      reorderPointerCaptureEl = null;
    }

    function resetReorderCandidate() {
      if (reorderCandidateItem) reorderCandidateItem.classList.remove('reorder-ready');
      releaseReorderPointerCapture();
      reorderPointerId = null;
      reorderCandidateItem = null;
    }

    function isReorderStartTarget(target) {
      if (!target) return false;
      if (target.closest('input, button, a, textarea, select, label, .habit-check, .habit-actions')) return false;
      return !!target.closest('.habit-item');
    }

    function prefersReducedMotion() {
      return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function persistHabitOrderFromDom() {
      const orderedIds = Array.from(habitsList.querySelectorAll('.habit-item')).map((item) => item.dataset.id);
      setHabits((prev) => {
        if (orderedIds.length !== prev.length) return prev;

        const byId = new Map(prev.map((habit) => [habit.id, habit]));
        const reordered = orderedIds.map((id) => byId.get(id)).filter(Boolean);
        if (reordered.length !== prev.length) return prev;

        const changed = reordered.some((habit, index) => habit.id !== prev[index].id);
        return changed ? reordered : prev;
      });
    }

    function renderDraggedItemAt(top, timestamp = performance.now()) {
      if (!reorderDragItem) return;
      const deltaY = top - reorderDragBaseTop;

      let wobbleX = 0;
      let wobbleDeg = 0;
      if (reordering && !prefersReducedMotion()) {
        const elapsed = timestamp - reorderDragStartedAt;
        const wave = Math.sin(elapsed * REORDER_WOBBLE_SPEED);
        wobbleX = wave * REORDER_WOBBLE_X;
        wobbleDeg = wave * REORDER_WOBBLE_DEG;
      }

      reorderDragItem.style.transform = `translate3d(${wobbleX}px, ${deltaY}px, 0) rotate(${wobbleDeg}deg) scale(1.015)`;
    }

    function animateReorderDrag(timestamp) {
      if (!reorderDragItem) {
        reorderAnimationFrame = null;
        return;
      }

      const diff = reorderDragTargetTop - reorderDragVisualTop;
      if (Math.abs(diff) < 0.35) {
        reorderDragVisualTop = reorderDragTargetTop;
      } else {
        reorderDragVisualTop += diff * REORDER_SMOOTHING;
      }

      renderDraggedItemAt(reorderDragVisualTop, timestamp);

      if (reordering) {
        reorderAnimationFrame = requestAnimationFrame(animateReorderDrag);
      } else {
        reorderAnimationFrame = null;
      }
    }

    function queueReorderDragAnimation() {
      if (reorderAnimationFrame) return;
      reorderAnimationFrame = requestAnimationFrame(animateReorderDrag);
    }

    function updateDragItemPosition(clientY) {
      if (!reorderDragItem) return;
      reorderDragTargetTop = clientY - reorderPointerOffsetY;
      queueReorderDragAnimation();
    }

    function updatePlaceholderPosition(clientY) {
      if (!reorderPlaceholder) return;

      const siblings = Array.from(habitsList.querySelectorAll('.habit-item')).filter((item) => item !== reorderDragItem);
      let insertBefore = null;

      for (const sibling of siblings) {
        const rect = sibling.getBoundingClientRect();
        if (clientY < rect.top + (rect.height / 2)) {
          insertBefore = sibling;
          break;
        }
      }

      if (insertBefore) {
        if (reorderPlaceholder.nextElementSibling !== insertBefore) {
          habitsList.insertBefore(reorderPlaceholder, insertBefore);
        }
      } else if (habitsList.lastElementChild !== reorderPlaceholder) {
        habitsList.appendChild(reorderPlaceholder);
      }
    }

    function startHabitReorder() {
      if (!reorderCandidateItem) return;

      const itemRect = reorderCandidateItem.getBoundingClientRect();
      reorderDragItem = reorderCandidateItem;
      reorderPointerOffsetY = reorderStartY - itemRect.top;
      reorderDragBaseTop = itemRect.top;
      reorderDragTargetTop = itemRect.top;
      reorderDragVisualTop = itemRect.top;
      reorderDragStartedAt = performance.now();

      reorderPlaceholder = document.createElement('div');
      reorderPlaceholder.className = 'habit-placeholder';
      reorderPlaceholder.style.height = `${itemRect.height}px`;

      habitsList.insertBefore(reorderPlaceholder, reorderDragItem.nextSibling);

      reorderDragItem.classList.add('dragging');
      reorderDragItem.classList.add('reorder-ready');
      reorderDragItem.style.width = `${itemRect.width}px`;
      reorderDragItem.style.height = `${itemRect.height}px`;
      reorderDragItem.style.left = `${itemRect.left}px`;
      reorderDragItem.style.top = `${reorderDragBaseTop}px`;

      document.body.appendChild(reorderDragItem);
      habitsList.classList.add('reorder-active');

      reordering = true;
      setIsHabitReordering(true);
      queueReorderDragAnimation();
    }

    function finishHabitReorder() {
      clearReorderPressTimer();
      stopReorderAnimation();

      if (!reordering || !reorderDragItem || !reorderPlaceholder) {
        reordering = false;
        setIsHabitReordering(false);
        resetReorderCandidate();
        return;
      }

      habitsList.insertBefore(reorderDragItem, reorderPlaceholder);
      reorderPlaceholder.remove();

      reorderDragItem.classList.remove('dragging');
      reorderDragItem.classList.remove('reorder-ready');
      reorderDragItem.style.removeProperty('width');
      reorderDragItem.style.removeProperty('height');
      reorderDragItem.style.removeProperty('left');
      reorderDragItem.style.removeProperty('top');
      reorderDragItem.style.removeProperty('transform');

      reorderPlaceholder = null;
      reorderDragItem = null;
      reorderDragBaseTop = 0;
      reorderDragTargetTop = 0;
      reorderDragVisualTop = 0;
      reorderDragStartedAt = 0;

      habitsList.classList.remove('reorder-active');
      reordering = false;
      setIsHabitReordering(false);

      persistHabitOrderFromDom();
      resetReorderCandidate();
    }

    const onPointerDown = (e) => {
      if (habitsList.querySelectorAll('.habit-item').length < 2) return;
      if (e.button !== undefined && e.button !== 0) return;
      if (!isReorderStartTarget(e.target)) return;

      const item = e.target.closest('.habit-item');
      if (!item || !habitsList.contains(item)) return;

      clearReorderPressTimer();
      reorderPointerId = e.pointerId;
      reorderCandidateItem = item;

      // Pointer capture is useful for touch drag reliability, but on desktop mouse
      // it can swallow click behavior on interactive card content.
      if (e.pointerType !== 'mouse' && item.setPointerCapture) {
        try {
          item.setPointerCapture(e.pointerId);
          reorderPointerCaptureEl = item;
        } catch (err) {
          reorderPointerCaptureEl = null;
        }
      }

      reorderStartX = e.clientX;
      reorderStartY = e.clientY;

      const holdDelay = e.pointerType === 'touch' ? REORDER_HOLD_MS : 180;
      reorderPressTimer = setTimeout(() => {
        if (!reorderCandidateItem) return;
        startHabitReorder();
      }, holdDelay);
    };

    const onPointerMove = (e) => {
      if (reorderPointerId !== null && e.pointerId !== reorderPointerId) return;

      if (!reordering && reorderCandidateItem) {
        const moved = Math.hypot(e.clientX - reorderStartX, e.clientY - reorderStartY);
        if (moved > REORDER_MOVE_CANCEL_PX) {
          clearReorderPressTimer();
          resetReorderCandidate();
        }
        return;
      }

      if (!reordering) return;

      if (e.cancelable) e.preventDefault();
      updateDragItemPosition(e.clientY);
      updatePlaceholderPosition(e.clientY);
    };

    const onPointerUp = (e) => {
      if (reorderPointerId !== null && e.pointerId !== reorderPointerId) return;

      if (reordering) {
        finishHabitReorder();
        return;
      }

      clearReorderPressTimer();
      resetReorderCandidate();
    };

    const onPointerCancel = (e) => {
      if (reorderPointerId !== null && e.pointerId !== reorderPointerId) return;

      if (reordering) {
        finishHabitReorder();
        return;
      }

      clearReorderPressTimer();
      resetReorderCandidate();
    };

    const onTouchMove = (e) => {
      if (!reordering) return;
      if (e.cancelable) e.preventDefault();
    };

    habitsList.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerCancel);
    document.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      clearReorderPressTimer();
      stopReorderAnimation();
      releaseReorderPointerCapture();

      habitsList.classList.remove('reorder-active');
      setIsHabitReordering(false);

      habitsList.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerCancel);
      document.removeEventListener('touchmove', onTouchMove);
    };
  }, [setHabits]);

  useEffect(() => {
    document.body.classList.toggle('habit-reorder-active', isHabitReordering);
    return () => {
      document.body.classList.remove('habit-reorder-active');
    };
  }, [isHabitReordering]);

  return {
    habitsListRef,
    isHabitReordering,
  };
}
