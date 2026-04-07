import { useEffect, useRef, useState } from 'react';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function isInteractiveTarget(el) {
  if (!el) return false;
  return !!el.closest('input, textarea, select, button, a, label, .modal, .tab-nav');
}

export default function useSwipeTabs({
  activeTab,
  setActiveTab,
  tabs,
  isHabitReordering,
  modalOpen,
}) {
  const [trackX, setTrackX] = useState(0);
  const [trackDragging, setTrackDragging] = useState(false);
  const tabsViewportRef = useRef(null);

  useEffect(() => {
    function isSwipeLayoutEnabled() {
      return !!(
        window.matchMedia
        && window.matchMedia('(pointer: coarse)').matches
        && window.matchMedia('(max-width: 900px)').matches
      );
    }

    function alignTrackToTab(tabName, animate) {
      if (!isSwipeLayoutEnabled()) {
        setTrackDragging(false);
        setTrackX(0);
        return;
      }
      const viewportWidth = tabsViewportRef.current?.clientWidth || 0;
      if (!viewportWidth) return;

      const idx = tabs.indexOf(tabName);
      const safeIndex = idx >= 0 ? idx : 0;
      setTrackDragging(!animate);
      setTrackX(-safeIndex * viewportWidth);
    }

    alignTrackToTab(activeTab, false);

    let startX = null;
    let startY = null;
    let trackingSwipe = false;
    let draggingSwipe = false;
    let baseX = 0;
    let startIndex = 0;

    const onResize = () => {
      alignTrackToTab(activeTab, false);
    };

    const onTouchStart = (e) => {
      if (!isSwipeLayoutEnabled()) return;
      if (isHabitReordering) return;
      if (modalOpen) return;
      if (isInteractiveTarget(e.target)) return;

      const viewportWidth = tabsViewportRef.current?.clientWidth || 0;
      if (!viewportWidth) return;

      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      trackingSwipe = true;
      draggingSwipe = false;

      startIndex = clamp(tabs.indexOf(activeTab), 0, tabs.length - 1);
      baseX = -startIndex * viewportWidth;
      setTrackDragging(true);
      setTrackX(baseX);
    };

    const onTouchMove = (e) => {
      if (isHabitReordering) {
        trackingSwipe = false;
        draggingSwipe = false;
        startX = null;
        startY = null;
        setTrackDragging(false);
        return;
      }

      if (!trackingSwipe || startX === null || startY === null) return;
      if (!isSwipeLayoutEnabled()) return;

      const curX = e.touches[0].clientX;
      const curY = e.touches[0].clientY;
      const deltaX = curX - startX;
      const deltaY = curY - startY;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (absY > absX && absY > 12) {
        trackingSwipe = false;
        draggingSwipe = false;
        startX = null;
        startY = null;
        setTrackDragging(false);
        alignTrackToTab(activeTab, true);
        return;
      }

      if (absX > 6 && absX > absY) {
        draggingSwipe = true;

        const viewportWidth = tabsViewportRef.current?.clientWidth || 0;
        const minX = -(tabs.length - 1) * viewportWidth;
        const maxX = 0;

        let nextX = baseX + deltaX;
        if (nextX > maxX) nextX = maxX + (nextX - maxX) * 0.25;
        if (nextX < minX) nextX = minX + (nextX - minX) * 0.25;
        setTrackX(nextX);
      }
    };

    const onTouchEnd = (e) => {
      if (isHabitReordering) {
        trackingSwipe = false;
        draggingSwipe = false;
        startX = null;
        startY = null;
        setTrackDragging(false);
        return;
      }

      if (!trackingSwipe || startX === null || startY === null) return;
      if (!isSwipeLayoutEnabled()) return;

      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const deltaX = endX - startX;
      const deltaY = endY - startY;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      const viewportWidth = tabsViewportRef.current?.clientWidth || 0;
      const threshold = Math.min(140, Math.max(70, Math.round(viewportWidth * 0.22)));

      if (draggingSwipe && absX > absY * 1.2) {
        if (deltaX <= -threshold) {
          setActiveTab(tabs[clamp(startIndex + 1, 0, tabs.length - 1)]);
        } else if (deltaX >= threshold) {
          setActiveTab(tabs[clamp(startIndex - 1, 0, tabs.length - 1)]);
        } else {
          alignTrackToTab(activeTab, true);
        }
      } else {
        alignTrackToTab(activeTab, true);
      }

      trackingSwipe = false;
      draggingSwipe = false;
      startX = null;
      startY = null;
      setTrackDragging(false);
    };

    window.addEventListener('resize', onResize);
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('resize', onResize);
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [activeTab, isHabitReordering, modalOpen, setActiveTab, tabs]);

  return {
    tabsViewportRef,
    trackX,
    trackDragging,
  };
}
