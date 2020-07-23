/* global _ */
import React from 'react';
import { toCssUrl } from 'src/libs/url_utils';
import Separator from 'src/components/ui/Separator';

const ImagesBlock = ({
  block,
  poi,
}) => {
  const images = block.images.filter(img => img.url !== poi.topImageUrl).slice(0, 3);
  if (!images || images.length === 0) {
    return null;
  }

  return <div className="poi_panel__pictures">
    <Separator />
    <h5 className="u-text--smallTitle">
      { _('Photos') }
    </h5>
    <div className="poi_panel__pictures_tiles">
      {
        images.map(i =>
          <a
            key={i.url}
            target="_blank"
            rel="noopener noreferrer"
            href={ i.source_url }
            className="poi_panel__pictures_tile"
            style={{ backgroundImage: toCssUrl(i.url) }}
          />)
      }
    </div>
  </div>;
};

export default ImagesBlock;
