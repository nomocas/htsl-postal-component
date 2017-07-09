/*
 * @Author: Gilles Coomans
 */
/* global */

import postal from 'postal';
import differ from 'htsl-dom-diffing-pragmatics';
import htmlLexicon from 'htsl-lexicon';

htmlLexicon.addAtoms(['postalComponent']);

// @usage .postalComponent(channel, Component, props)

differ.renderActions.postalComponent = function($tag, lexem, parent) {
	const channel = lexem.args[0],
		instance = lexem.instance = new(lexem.args[1])(lexem.args[2], parent);

	instance.witness = document.createComment('postalComponent');

	instance._render = function() {
		const developed = this.render(true);
		if (this.developed)
			differ.dif($tag, developed, this.developed, instance);
		else
			differ.render($tag, developed, instance);
		this.developed = developed;
	};

	instance._remove = function() {
		// unmount
		if (this.developed) {
			differ.seekAndUnmountComponent(this.developed); // depth-first
			differ.remove($tag, this.developed, instance);
		}
		this.developed = null;
	};

	linkPostal($tag, channel, lexem, instance);

	$tag.appendChild(instance.witness);
};

differ.difActions.postalComponent = function($tag, lexem, olexem) {
	if (lexem.args[1] !== olexem.args[1])
		throw new Error('You must not change component\'s class when rerendering');
	const instance = lexem.instance = olexem.instance;
	lexem.witness = olexem.witness;
	if (instance.developed)
		instance.setProps(lexem.args[2]);
	else
		instance.props = Object.assign({}, instance.props, lexem.args[2]);
};

differ.removeActions.postalComponent = function($tag, lexem) {
	lexem.instance.unmount();
	// $tag.removeChild(lexem.instance.witness); // done by differ.remove()
	lexem.instance.showUnsubscribe.unsubscribe();
	lexem.instance.hideUnsubscribe.unsubscribe();
	lexem.instance.toggleUnsubscribe.unsubscribe();
};


function mountComponent($tag, instance, witness, data) {
	// mount
	if (data)
		instance.state = Object.assign({}, instance.state, data);
	if (instance.animFrame)
		cancelAnimationFrame(instance.animFrame);

	instance.unmounted = false;
	instance.animFrame = requestAnimationFrame(() => {
		instance.animFrame = null;
		instance.componentWillMount();
		instance.developed = instance.render(true);
		const frag = document.createDocumentFragment();
		differ.render($tag, instance.developed, instance, frag);
		$tag.insertBefore(frag, witness);
		instance.componentDidMount();
	});
}


// LINK TO POSTAL HIDE/SHOW/TOGGLE
function linkPostal($tag, channel, lexem, instance) {
	// show : so mount
	instance.showUnsubscribe = postal.subscribe({
		channel,
		topic: 'show',
		callback: (data) => {
			if (instance.developed) // dif
				instance.setState(data);
			else // mount
				mountComponent($tag, instance, lexem.witness, data);
		}
	});
	// hide : so unmount
	instance.hideUnsubscribe = postal.subscribe({
		channel,
		topic: 'hide',
		callback: () => {
			if (instance.developed)
				instance.unmount();
		}
	});
	// toggle
	instance.toggleUnsubscribe = postal.subscribe({
		channel,
		topic: 'toggle',
		callback: (data) => {
			if (instance.developed)
				instance.unmount();
			else
				mountComponent($tag, instance, lexem.witness, data);
		}
	});
}

module.exports = function injectPostal(p) {
	postal = p;
};
