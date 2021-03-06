/* globals _ */
import React from 'react';
import PropTypes from 'prop-types';
import IconManager from 'src/adapters/icon_manager';
import { htmlEncode } from 'src/libs/string';
import poiSubClass from 'src/mapbox/poi_subclass';
import Telemetry from 'src/libs/telemetry';
import ShareMenu from 'src/components/ui/ShareMenu';
import { toAbsoluteUrl, toUrl } from 'src/libs/pois';

export default class FavoritePoi extends React.Component {
  static propTypes = {
    poi: PropTypes.object.isRequired,
    removeFavorite: PropTypes.func.isRequired,
  }

  onClick = () => {
    Telemetry.add(Telemetry.FAVORITE_GO);
    window.app.navigateTo(`/place/${toUrl(this.props.poi)}`, {
      poi: this.props.poi,
      centerMap: true,
      isFromFavorite: true,
    });
  }

  onDelete = () => {
    this.props.removeFavorite(this.props.poi);
  };

  onShareClick = (e, handler) => {
    Telemetry.add(Telemetry.FAVORITE_SHARE);
    return handler(e);
  }

  render() {
    const { poi } = this.props;
    const icon = IconManager.get(poi);
    return <div className="favorite_panel__item">
      <div
        className={`favorite_panel__item__image icon icon-${icon && icon.iconClass}`}
        style={{ color: icon && icon.color || '#444648' }}
      />
      <div className="favorite_panel__item__info" onClick={this.onClick}>
        <p
          className="favorite_panel__item__title"
          dangerouslySetInnerHTML={{ __html: poi.name
            ? htmlEncode(poi.name)
            : 'default',
          }}
        />
        <p className="favorite_panel__item__desc u-text--subtitle u-firstCap">
          {poi.subClassName ? poiSubClass(poi.subClassName) : ''}
        </p>
      </div>
      <ShareMenu url={toAbsoluteUrl(this.props.poi)} scrollableParent=".panel-content">
        {openMenu =>
          <div
            className="favorite_panel__item__share"
            title={_('Share')}
            onClick={e => this.onShareClick(e, openMenu)}
          >
            <i className="icon-share-2" />
          </div>}
      </ShareMenu>
      <div className="favorite_panel__item__delete" title={_('Delete')} onClick={this.onDelete}>
        <span className="icon-trash"></span>
      </div>
    </div>;
  }
}
