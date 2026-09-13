import { Navigation } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/design-system/components/Button';
import { arrivalModesForAccess } from '../arrival/arrivalModes';
import { ArrivalDrawer } from './ArrivalDrawer';

interface NavigateToLocationActionProps {
  locationId: string;
  name: string;
  latitude: number;
  longitude: number;
  accessType?: string | null;
}

export function NavigateToLocationAction({
  locationId,
  name,
  latitude,
  longitude,
  accessType,
}: NavigateToLocationActionProps) {
  const [open, setOpen] = useState(false);
  const modes = arrivalModesForAccess(accessType);

  return (
    <>
      <Button type="button" variant="primary" data-kind="arrive" onClick={() => setOpen(true)}>
        <Navigation size={20} aria-hidden="true" /> Como chegar
      </Button>
      {open ? (
        <ArrivalDrawer
          locationId={locationId}
          name={name}
          latitude={latitude}
          longitude={longitude}
          accessType={accessType}
          modes={modes}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
