/* globals _ */
import React from 'react';
import PropTypes from 'prop-types';

const PhoneBlock = ({ block }) =>
  <div className="poi_panel__info__section poi_panel__info__section--phone">
    <div className="poi_panel__info__section__description">
      <div className="icon-icon_phone poi_panel__block__symbol"></div>
      <div className="poi_panel__block__content">
        <span className="poi_panel__block__content__title">{_('Phone')}</span>
        <a
          className="poi_panel__block__content__paragraph .poi_panel__info__section--phone"
          href={block.url}>
          {block.local_format}
        </a>
      </div>
    </div>
  </div>
;

PhoneBlock.propTypes = {
  block: PropTypes.object,
};

export default PhoneBlock;
